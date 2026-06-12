-- ============================================================================
-- 0003_user_data.sql
-- Dados do cooperado: custos de produção, alertas, relatórios.
-- Todos isolados por cooperado (RLS por auth.uid()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CUSTOS_PRODUCAO  (base da calculadora de margem F03)
-- ----------------------------------------------------------------------------
create table public.custos_producao (
  id              uuid primary key default uuid_generate_v4(),
  cooperado_id    uuid not null references public.cooperados(id) on delete cascade,
  commodity       public.commodity not null,
  safra           text not null,             -- ex '2025/26'
  custo_por_saca  numeric not null,
  created_at      timestamptz not null default now(),
  unique (cooperado_id, commodity, safra)
);

create index idx_custos_cooperado on public.custos_producao(cooperado_id);

-- ----------------------------------------------------------------------------
-- ALERTAS  (F04 — gatilhos configuráveis)
-- ----------------------------------------------------------------------------
create table public.alertas (
  id              uuid primary key default uuid_generate_v4(),
  cooperado_id    uuid not null references public.cooperados(id) on delete cascade,
  tipo            text not null check (tipo in ('preco','margem','cambio','sinal_ia')),
  commodity       public.commodity,          -- null p/ alerta de câmbio
  par_cambio      text,                      -- 'USD/BRL' p/ tipo=cambio
  operador        text not null default '>=' check (operador in ('>=','<=')),
  valor_alvo      numeric,                   -- null p/ tipo=sinal_ia
  canais          text[] not null default '{push}', -- {push,whatsapp}
  ativo           boolean not null default true,
  ultimo_disparo  timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_alertas_cooperado on public.alertas(cooperado_id);
create index idx_alertas_ativos on public.alertas(ativo) where ativo = true;

-- ----------------------------------------------------------------------------
-- RELATORIOS  (F08 — PDF semanal)
-- ----------------------------------------------------------------------------
create table public.relatorios (
  id            uuid primary key default uuid_generate_v4(),
  cooperado_id  uuid not null references public.cooperados(id) on delete cascade,
  semana        date not null,               -- segunda-feira de referência
  pdf_url       text,
  aberto        boolean not null default false,
  enviado_em    timestamptz,
  created_at    timestamptz not null default now(),
  unique (cooperado_id, semana)
);

create index idx_relatorios_cooperado on public.relatorios(cooperado_id);

-- ----------------------------------------------------------------------------
-- RLS — tudo isolado por cooperado (auth.uid())
-- ----------------------------------------------------------------------------
alter table public.custos_producao enable row level security;
alter table public.alertas         enable row level security;
alter table public.relatorios      enable row level security;

create policy "custos: dono"
  on public.custos_producao for all
  using (cooperado_id = auth.uid())
  with check (cooperado_id = auth.uid());

create policy "alertas: dono"
  on public.alertas for all
  using (cooperado_id = auth.uid())
  with check (cooperado_id = auth.uid());

create policy "relatorios: dono ler"
  on public.relatorios for select
  using (cooperado_id = auth.uid());

create policy "relatorios: dono atualizar (marcar aberto)"
  on public.relatorios for update
  using (cooperado_id = auth.uid());
-- Insert de relatório é feito pelo relatorio-worker (service role).
