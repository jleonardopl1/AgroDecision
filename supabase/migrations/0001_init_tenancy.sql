-- ============================================================================
-- 0001_init_tenancy.sql
-- Fundação multi-tenant: cooperativas (tenant root) + cooperados + RLS.
-- AgroDecision · Yamazing Corp
-- ============================================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- COOPERATIVAS  (tenant root)
-- ----------------------------------------------------------------------------
create table public.cooperativas (
  id                    uuid primary key default uuid_generate_v4(),
  nome                  text not null,
  slug                  text not null unique,           -- URL co-branded: /c/<slug>
  logo_url              text,
  cor_primaria          text not null default '#1A5C38', -- verde-campo
  cor_secundaria        text not null default '#F59E0B', -- laranja-colheita
  plano                 text not null default 'starter'
                          check (plano in ('starter','pro','enterprise')),
  seats                 int  not null default 500,
  estado                text,                            -- UF (PR, SP, ...)
  stripe_customer_id    text,
  stripe_subscription_id text,
  status                text not null default 'trial'
                          check (status in ('trial','active','past_due','canceled')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.cooperativas is 'Tenant root. Cada cooperativa é um tenant isolado.';

-- ----------------------------------------------------------------------------
-- COOPERADOS  (usuário/produtor; 1:1 com auth.users)
-- ----------------------------------------------------------------------------
create table public.cooperados (
  id              uuid primary key references auth.users(id) on delete cascade,
  cooperativa_id  uuid not null references public.cooperativas(id) on delete restrict,
  nome            text not null,
  cpf_cnpj        text,
  email           text not null,
  culturas        text[] not null default '{}',  -- {soja,milho,cafe,algodao,boi}
  area_ha         numeric,
  plano           text not null default 'free'
                    check (plano in ('free','pro')),
  role            text not null default 'cooperado'
                    check (role in ('cooperado','admin_coop')), -- admin gerencia a coop
  stripe_subscription_id text,
  created_at      timestamptz not null default now()
);

create index idx_cooperados_cooperativa on public.cooperados(cooperativa_id);

comment on table public.cooperados is 'Produtor rural vinculado a uma cooperativa.';

-- ----------------------------------------------------------------------------
-- Helper RLS: cooperativa_id do usuário atual (SECURITY DEFINER evita recursão)
-- ----------------------------------------------------------------------------
create or replace function public.current_cooperativa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cooperativa_id from public.cooperados where id = auth.uid();
$$;

create or replace function public.is_coop_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin_coop' from public.cooperados where id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.cooperativas enable row level security;
alter table public.cooperados   enable row level security;

-- Cooperativa: o cooperado lê apenas a própria cooperativa; admin da coop pode atualizar.
create policy "coop: ler propria"
  on public.cooperativas for select
  using (id = public.current_cooperativa_id());

create policy "coop: admin atualiza propria"
  on public.cooperativas for update
  using (id = public.current_cooperativa_id() and public.is_coop_admin());

-- Cooperado: lê o próprio registro e os colegas da mesma cooperativa (p/ benchmark anonimizado).
create policy "cooperado: ler mesma coop"
  on public.cooperados for select
  using (cooperativa_id = public.current_cooperativa_id());

-- Cooperado atualiza apenas o próprio perfil.
create policy "cooperado: atualizar proprio"
  on public.cooperados for update
  using (id = auth.uid());

-- Insert de cooperado é feito via trigger de signup / service role (ver app).
create policy "cooperado: inserir proprio"
  on public.cooperados for insert
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_coop_updated
  before update on public.cooperativas
  for each row execute function public.touch_updated_at();
