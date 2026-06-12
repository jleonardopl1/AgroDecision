-- ============================================================================
-- 0002_market_data.sql
-- Dados de mercado: config de commodities (por coop) + cache de cotações e
-- sinais de IA (COMPARTILHADOS — dado de mercado não tem tenant).
-- ============================================================================

-- Commodities suportadas no MVP
create type public.commodity as enum ('soja','milho','cafe','algodao','boi');

-- ----------------------------------------------------------------------------
-- COMMODITIES_CONFIG  (quais commodities cada cooperativa exibe) — tenant-scoped
-- ----------------------------------------------------------------------------
create table public.commodities_config (
  id              uuid primary key default uuid_generate_v4(),
  cooperativa_id  uuid not null references public.cooperativas(id) on delete cascade,
  commodity       public.commodity not null,
  ativo           boolean not null default true,
  unique (cooperativa_id, commodity)
);

create index idx_commodities_config_coop on public.commodities_config(cooperativa_id);

-- ----------------------------------------------------------------------------
-- COTACOES_CACHE  (COMPARTILHADA — atualizada a cada 15min pelo cotacao-worker)
-- ----------------------------------------------------------------------------
create table public.cotacoes_cache (
  id            uuid primary key default uuid_generate_v4(),
  commodity     public.commodity not null,
  fonte         text not null check (fonte in ('cepea','b3','usda')),
  preco         numeric not null,
  unidade       text not null default 'R$/saca',
  variacao_pct  numeric,                 -- variação diária %
  regiao        text,                    -- UF para mapa de calor (null = nacional)
  tipo          text not null default 'spot' check (tipo in ('spot','futuro')),
  vencimento    date,                    -- p/ contratos futuros B3
  capturado_em  timestamptz not null default now()
);

create index idx_cotacoes_commodity_data on public.cotacoes_cache(commodity, capturado_em desc);
create index idx_cotacoes_regiao on public.cotacoes_cache(commodity, regiao);

comment on table public.cotacoes_cache is 'Cache compartilhado de cotações. Sem tenant. Leitura para todos autenticados.';

-- ----------------------------------------------------------------------------
-- SINAIS_IA  (COMPARTILHADA — histórico de recomendações por commodity)
-- ----------------------------------------------------------------------------
create table public.sinais_ia (
  id            uuid primary key default uuid_generate_v4(),
  commodity     public.commodity not null,
  sinal         text not null check (sinal in ('VENDER','AGUARDAR','ATENCAO')),
  recomendacao  text not null,           -- ex: 'VENDER PARCIAL 30%'
  justificativa text not null,           -- linguagem simples p/ o produtor
  fatores       jsonb not null default '{}'::jsonb, -- {tendencia, sazonalidade, fundos, cambio}
  confianca     numeric,                 -- 0..1 (transparência)
  modelo        text not null default 'claude-sonnet',
  gerado_em     timestamptz not null default now()
);

create index idx_sinais_commodity_data on public.sinais_ia(commodity, gerado_em desc);

comment on table public.sinais_ia is 'Sinal de IA por commodity/hora. NUNCA por usuário (protege margem).';

-- ----------------------------------------------------------------------------
-- CAMBIO  (COMPARTILHADA — USD/BRL, EUR/BRL)
-- ----------------------------------------------------------------------------
create table public.cambio_cache (
  id            uuid primary key default uuid_generate_v4(),
  par           text not null check (par in ('USD/BRL','EUR/BRL')),
  cotacao       numeric not null,
  variacao_pct  numeric,
  capturado_em  timestamptz not null default now()
);

create index idx_cambio_par_data on public.cambio_cache(par, capturado_em desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.commodities_config enable row level security;
alter table public.cotacoes_cache     enable row level security;
alter table public.sinais_ia          enable row level security;
alter table public.cambio_cache       enable row level security;

-- Config de commodities: isolada por cooperativa
create policy "commodities_config: ler mesma coop"
  on public.commodities_config for select
  using (cooperativa_id = public.current_cooperativa_id());

create policy "commodities_config: admin gerencia"
  on public.commodities_config for all
  using (cooperativa_id = public.current_cooperativa_id() and public.is_coop_admin())
  with check (cooperativa_id = public.current_cooperativa_id() and public.is_coop_admin());

-- Dados de mercado: leitura para qualquer autenticado; escrita só service role (workers).
create policy "cotacoes: leitura autenticada"
  on public.cotacoes_cache for select using (auth.role() = 'authenticated');

create policy "sinais: leitura autenticada"
  on public.sinais_ia for select using (auth.role() = 'authenticated');

create policy "cambio: leitura autenticada"
  on public.cambio_cache for select using (auth.role() = 'authenticated');

-- Nota: workers escrevem com a service_role key, que bypassa RLS por padrão.
