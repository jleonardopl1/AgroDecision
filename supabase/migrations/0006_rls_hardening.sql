-- ============================================================================
-- 0006_rls_hardening.sql
-- Fecha brechas de escalonamento de privilégio / salto de tenant nas policies
-- de UPDATE que tinham USING mas não WITH CHECK, e protege colunas sensíveis
-- contra alteração pela API pública via triggers BEFORE UPDATE.
--
-- Contexto: com a publishable key (pública) qualquer cooperado autenticado
-- conseguia chamar update() em cooperados/cooperativas. Sem WITH CHECK, a linha
-- NOVA não era validada; e mesmo com WITH CHECK = USING, colunas como role,
-- cooperativa_id e plano poderiam ser trocadas (o id continua satisfazendo a
-- condição). RLS não compara OLD vs NEW — por isso os triggers abaixo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- COOPERADOS: WITH CHECK + trava de colunas privilegiadas
-- ----------------------------------------------------------------------------
drop policy if exists "cooperado: atualizar proprio" on public.cooperados;
create policy "cooperado: atualizar proprio"
  on public.cooperados for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.protect_cooperado_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (signup trigger, webhooks, backoffice) ignora a trava.
  if auth.role() = 'service_role' then
    return new;
  end if;
  -- O cooperado só edita nome, cpf_cnpj, culturas e area_ha. As demais colunas
  -- são imutáveis via API: evita auto-promoção a admin, salto de cooperativa,
  -- upgrade de plano grátis e spoofing de e-mail/id.
  new.id                     := old.id;
  new.cooperativa_id         := old.cooperativa_id;
  new.email                  := old.email;
  new.plano                  := old.plano;
  new.role                   := old.role;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.created_at             := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_protect_cooperado_cols on public.cooperados;
create trigger trg_protect_cooperado_cols
  before update on public.cooperados
  for each row execute function public.protect_cooperado_cols();

-- ----------------------------------------------------------------------------
-- COOPERATIVAS: WITH CHECK + trava das colunas de plano/cobrança
-- ----------------------------------------------------------------------------
drop policy if exists "coop: admin atualiza propria" on public.cooperativas;
create policy "coop: admin atualiza propria"
  on public.cooperativas for update
  using (id = public.current_cooperativa_id() and public.is_coop_admin())
  with check (id = public.current_cooperativa_id() and public.is_coop_admin());

create or replace function public.protect_cooperativa_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  -- O admin da coop só altera marca (nome, logo, cores, estado). Plano, seats,
  -- status, ids do Stripe e slug são governados pelo backend/Stripe.
  new.id                     := old.id;
  new.slug                   := old.slug;
  new.plano                  := old.plano;
  new.seats                  := old.seats;
  new.status                 := old.status;
  new.stripe_customer_id     := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.created_at             := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_protect_cooperativa_cols on public.cooperativas;
create trigger trg_protect_cooperativa_cols
  before update on public.cooperativas
  for each row execute function public.protect_cooperativa_cols();

-- ----------------------------------------------------------------------------
-- RELATORIOS: WITH CHECK + só permite alternar "aberto"
-- ----------------------------------------------------------------------------
drop policy if exists "relatorios: dono atualizar (marcar aberto)" on public.relatorios;
create policy "relatorios: dono atualizar (marcar aberto)"
  on public.relatorios for update
  using (cooperado_id = auth.uid())
  with check (cooperado_id = auth.uid());

create or replace function public.protect_relatorio_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  -- O cooperado só marca o relatório como aberto. pdf_url, semana e enviado_em
  -- são gravados pelo relatorio-worker (evita injeção de URL arbitrária).
  new.id           := old.id;
  new.cooperado_id := old.cooperado_id;
  new.semana       := old.semana;
  new.pdf_url      := old.pdf_url;
  new.enviado_em   := old.enviado_em;
  new.created_at   := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_protect_relatorio_cols on public.relatorios;
create trigger trg_protect_relatorio_cols
  before update on public.relatorios
  for each row execute function public.protect_relatorio_cols();

-- ----------------------------------------------------------------------------
-- REVENUE SHARE: valor_share deve honrar share_pct (estava com 0.20 fixo)
-- ----------------------------------------------------------------------------
alter table public.revenue_share_events drop column if exists valor_share;
alter table public.revenue_share_events
  add column valor_share numeric generated always as (valor_assinatura * share_pct) stored;
