-- ============================================================================
-- 0008_rbac_staff.sql
-- RBAC da plataforma AgroDecision: equipe interna (staff) + grupos + permissões.
-- Master (CEO) bypassa tudo; grupos (Board, Programadores, Dados, Comercial,
-- Marketing) recebem permissões cross-tenant. Cooperativas seguem ISOLADAS:
-- nenhuma cooperativa enxerga dados de outra. Staff só lê cross-tenant conforme
-- a permissão do(s) grupo(s).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================================

-- 1) Enum de permissões da plataforma
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_permission') then
    create type public.app_permission as enum (
      'analytics:read_all','coops:read','coops:manage','cooperados:read',
      'legal:read','legal:manage','billing:read','marketing:read','staff:manage'
    );
  end if;
end $$;

-- 2) Tabelas
create table if not exists public.staff_members (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  is_master   boolean not null default false,   -- CEO / superusuário
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.staff_members is 'Equipe interna AgroDecision (NAO e cooperado). Master bypassa permissoes.';

create table if not exists public.access_groups (
  id          uuid primary key default uuid_generate_v4(),
  chave       text not null unique,            -- 'board','dados',...
  nome        text not null,
  descricao   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_permissions (
  group_id    uuid not null references public.access_groups(id) on delete cascade,
  permission  public.app_permission not null,
  primary key (group_id, permission)
);

create table if not exists public.staff_group_members (
  staff_id    uuid not null references public.staff_members(id) on delete cascade,
  group_id    uuid not null references public.access_groups(id) on delete cascade,
  primary key (staff_id, group_id)
);
create index if not exists idx_staff_group_staff on public.staff_group_members(staff_id);

-- 3) Helpers (SECURITY DEFINER — evitam recursão de RLS)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_members where id = auth.uid() and ativo);
$$;

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_master and ativo from public.staff_members where id = auth.uid()), false);
$$;

create or replace function public.staff_has_permission(perm public.app_permission)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_master() or exists (
    select 1
    from public.staff_group_members sgm
    join public.group_permissions gp on gp.group_id = sgm.group_id
    join public.staff_members s on s.id = sgm.staff_id
    where sgm.staff_id = auth.uid() and s.ativo and gp.permission = perm
  );
$$;

-- 4) RLS nas tabelas de RBAC
alter table public.staff_members      enable row level security;
alter table public.access_groups      enable row level security;
alter table public.group_permissions  enable row level security;
alter table public.staff_group_members enable row level security;

drop policy if exists "staff: ler proprio ou gestor" on public.staff_members;
create policy "staff: ler proprio ou gestor" on public.staff_members for select
  using (id = auth.uid() or public.staff_has_permission('staff:manage'));
drop policy if exists "staff: gestor gerencia" on public.staff_members;
create policy "staff: gestor gerencia" on public.staff_members for all
  using (public.staff_has_permission('staff:manage'))
  with check (public.staff_has_permission('staff:manage'));

drop policy if exists "grupos: staff le" on public.access_groups;
create policy "grupos: staff le" on public.access_groups for select using (public.is_staff());
drop policy if exists "grupos: gestor gerencia" on public.access_groups;
create policy "grupos: gestor gerencia" on public.access_groups for all
  using (public.staff_has_permission('staff:manage')) with check (public.staff_has_permission('staff:manage'));

drop policy if exists "perms: staff le" on public.group_permissions;
create policy "perms: staff le" on public.group_permissions for select using (public.is_staff());
drop policy if exists "perms: gestor gerencia" on public.group_permissions;
create policy "perms: gestor gerencia" on public.group_permissions for all
  using (public.staff_has_permission('staff:manage')) with check (public.staff_has_permission('staff:manage'));

drop policy if exists "membros: staff le" on public.staff_group_members;
create policy "membros: staff le" on public.staff_group_members for select using (public.is_staff());
drop policy if exists "membros: gestor gerencia" on public.staff_group_members;
create policy "membros: gestor gerencia" on public.staff_group_members for all
  using (public.staff_has_permission('staff:manage')) with check (public.staff_has_permission('staff:manage'));

-- 5) Acesso cross-tenant do staff (apenas SELECT; isolamento dos tenants permanece)
drop policy if exists "coops: staff com permissao le" on public.cooperativas;
create policy "coops: staff com permissao le" on public.cooperativas for select
  using (public.staff_has_permission('coops:read'));

drop policy if exists "cooperados: staff com permissao le" on public.cooperados;
create policy "cooperados: staff com permissao le" on public.cooperados for select
  using (public.staff_has_permission('cooperados:read'));

-- 6) Seed: grupos padrão
insert into public.access_groups (chave, nome, descricao) values
  ('board','Board','Visao executiva e KPIs gerais'),
  ('programadores','Programadores','Acesso tecnico'),
  ('dados','Dados','Analytics e performance (todas as cooperativas)'),
  ('comercial','Comercial','Cooperativas, pipeline e contratos'),
  ('marketing','Marketing','Metricas de marketing e leads')
on conflict (chave) do nothing;

-- 7) Seed: permissões por grupo (ajuste à vontade)
insert into public.group_permissions (group_id, permission)
select g.id, p.permission::public.app_permission
from public.access_groups g
join (values
  ('board','analytics:read_all'),('board','coops:read'),('board','billing:read'),('board','legal:read'),
  ('programadores','analytics:read_all'),('programadores','coops:read'),
  ('dados','analytics:read_all'),('dados','coops:read'),('dados','cooperados:read'),
  ('comercial','coops:read'),('comercial','coops:manage'),('comercial','legal:read'),('comercial','billing:read'),
  ('marketing','marketing:read'),('marketing','analytics:read_all')
) as p(chave, permission) on p.chave = g.chave
on conflict do nothing;

-- 8) Master = CEO (por e-mail). Só aplica quando o usuário já existir em auth.users.
--    Se o CEO ainda não tiver conta, rode este bloco novamente após o cadastro.
insert into public.staff_members (id, nome, email, is_master)
select u.id, coalesce(u.raw_user_meta_data->>'nome','CEO'), u.email, true
from auth.users u
where u.email = 'jleonardopl@gmail.com'
on conflict (id) do update set is_master = true, ativo = true;
