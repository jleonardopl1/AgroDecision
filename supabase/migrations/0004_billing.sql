-- ============================================================================
-- 0004_billing.sql
-- Faturamento: eventos de revenue share 20% (cooperativa ganha quando cooperado
-- faz upgrade para Pro). Detalhe do modelo em docs/PRICING_AND_BILLING.md.
-- ============================================================================

create table public.revenue_share_events (
  id              uuid primary key default uuid_generate_v4(),
  cooperativa_id  uuid not null references public.cooperativas(id) on delete cascade,
  cooperado_id    uuid references public.cooperados(id) on delete set null,
  origem          text not null default 'cooperado_pro_upgrade',
  valor_assinatura numeric not null,        -- ex 49.00
  share_pct       numeric not null default 0.20,
  valor_share     numeric generated always as (valor_assinatura * 0.20) stored,
  stripe_invoice_id text,
  competencia     date not null,            -- mês de referência
  created_at      timestamptz not null default now()
);

create index idx_revshare_coop on public.revenue_share_events(cooperativa_id, competencia);

alter table public.revenue_share_events enable row level security;

-- Admin da cooperativa vê os próprios eventos de revenue share.
create policy "revshare: admin coop le"
  on public.revenue_share_events for select
  using (cooperativa_id = public.current_cooperativa_id() and public.is_coop_admin());
-- Insert é feito pelo webhook do Stripe (service role).
