-- ============================================================================
-- 0007_carteira_e_chat.sql
-- Carteira comercial do cooperado (produção por safra + fixações de preço),
-- vínculos de canal (WhatsApp/Telegram) e histórico do chatbot.
--
-- Motivação (F09/F10): o produtor fixa parcelas da safra e esquece quanto já
-- fixou; quer saber o % vendido e simular "se eu vender hoje, quanto recebo?".
-- O chatbot (edge function `chatbot`) usa estas tabelas para montar o cenário
-- comercial personalizado e registrar dados informados na conversa.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRODUCOES — produção estimada por cultura/safra (denominador do % vendido)
-- ----------------------------------------------------------------------------
create table public.producoes (
  id               uuid primary key default uuid_generate_v4(),
  cooperado_id     uuid not null references public.cooperados(id) on delete cascade,
  commodity        public.commodity not null,
  safra            text not null,                -- ex '2025/26'
  area_ha          numeric check (area_ha is null or area_ha > 0),
  producao_sacas   numeric check (producao_sacas is null or producao_sacas > 0),
  preco_alvo       numeric check (preco_alvo is null or preco_alvo > 0),      -- R$/saca desejado
  margem_alvo_pct  numeric check (margem_alvo_pct is null or margem_alvo_pct > 0), -- % sobre o custo
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (cooperado_id, commodity, safra)
);

create index idx_producoes_cooperado on public.producoes(cooperado_id);

create trigger trg_producoes_updated
  before update on public.producoes
  for each row execute function public.touch_updated_at();

comment on table public.producoes is 'Produção estimada por cultura/safra — base do % de safra vendido.';

-- ----------------------------------------------------------------------------
-- FIXACOES — cada contrato/fixação de preço (o produtor esquece quanto fixou)
-- ----------------------------------------------------------------------------
create table public.fixacoes (
  id            uuid primary key default uuid_generate_v4(),
  cooperado_id  uuid not null references public.cooperados(id) on delete cascade,
  commodity     public.commodity not null,
  safra         text not null,
  sacas         numeric not null check (sacas > 0),   -- sacas ou arrobas
  preco         numeric not null check (preco > 0),   -- R$/saca fixado
  fixado_em     date not null default current_date,
  canal         text not null default 'app' check (canal in ('app','whatsapp','telegram')),
  observacao    text,
  created_at    timestamptz not null default now()
);

create index idx_fixacoes_cooperado on public.fixacoes(cooperado_id, commodity, safra);

comment on table public.fixacoes is 'Fixações/vendas parciais da safra. Soma ÷ produção = % vendido.';

-- ----------------------------------------------------------------------------
-- CHAT_VINCULOS — pareamento do cooperado com WhatsApp/Telegram
-- ----------------------------------------------------------------------------
create table public.chat_vinculos (
  id            uuid primary key default uuid_generate_v4(),
  cooperado_id  uuid not null references public.cooperados(id) on delete cascade,
  canal         text not null check (canal in ('whatsapp','telegram')),
  codigo        text not null,            -- código exibido no app; o produtor envia no canal
  chat_id       text,                     -- telegram chat_id / telefone WhatsApp (só dígitos)
  verificado    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (cooperado_id, canal),
  unique (canal, chat_id)
);

create index idx_chat_vinculos_codigo on public.chat_vinculos(canal, codigo) where not verificado;

comment on table public.chat_vinculos is 'Vínculo cooperado ↔ canal. chat_id/verificado são gravados pelo webhook (service role).';

-- ----------------------------------------------------------------------------
-- CHAT_MENSAGENS — histórico da conversa (contexto do bot + UI do app)
-- ----------------------------------------------------------------------------
create table public.chat_mensagens (
  id            uuid primary key default uuid_generate_v4(),
  cooperado_id  uuid not null references public.cooperados(id) on delete cascade,
  canal         text not null check (canal in ('app','whatsapp','telegram')),
  role          text not null check (role in ('user','assistant')),
  conteudo      text not null,
  criado_em     timestamptz not null default now()
);

create index idx_chat_mensagens_conversa on public.chat_mensagens(cooperado_id, canal, criado_em desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.producoes      enable row level security;
alter table public.fixacoes       enable row level security;
alter table public.chat_vinculos  enable row level security;
alter table public.chat_mensagens enable row level security;

create policy "producoes: dono"
  on public.producoes for all
  using (cooperado_id = auth.uid())
  with check (cooperado_id = auth.uid());

create policy "fixacoes: dono"
  on public.fixacoes for all
  using (cooperado_id = auth.uid())
  with check (cooperado_id = auth.uid());

-- Vínculo: o app só cria/recria o registro PENDENTE (codigo). chat_id e
-- verificado são preenchidos pelo webhook com service role — impede que um
-- usuário reivindique o telefone/chat de outra pessoa.
create policy "vinculos: dono ler"
  on public.chat_vinculos for select
  using (cooperado_id = auth.uid());

create policy "vinculos: dono criar pendente"
  on public.chat_vinculos for insert
  with check (cooperado_id = auth.uid() and chat_id is null and verificado = false);

create policy "vinculos: dono remover"
  on public.chat_vinculos for delete
  using (cooperado_id = auth.uid());

-- Histórico: o app lê a própria conversa; quem escreve é a edge function
-- (service role) — tanto a pergunta do usuário quanto a resposta do bot.
create policy "chat: dono ler"
  on public.chat_mensagens for select
  using (cooperado_id = auth.uid());
