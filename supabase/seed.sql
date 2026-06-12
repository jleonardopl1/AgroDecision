-- ============================================================================
-- seed.sql — dados de demonstração para desenvolvimento local.
-- Rodado por: supabase db reset
-- NÃO usar em produção.
-- ============================================================================

-- Cooperativa demo (co-branded para testar o portal multi-tenant)
insert into public.cooperativas (id, nome, slug, plano, seats, estado, status)
values
  ('00000000-0000-0000-0000-000000000001', 'Cooperativa Demo', 'demo', 'pro', 2000, 'PR', 'active');

-- Commodities habilitadas para a cooperativa demo
insert into public.commodities_config (cooperativa_id, commodity, ativo) values
  ('00000000-0000-0000-0000-000000000001', 'soja',    true),
  ('00000000-0000-0000-0000-000000000001', 'milho',   true),
  ('00000000-0000-0000-0000-000000000001', 'cafe',    true),
  ('00000000-0000-0000-0000-000000000001', 'algodao', false),
  ('00000000-0000-0000-0000-000000000001', 'boi',     true);

-- Cotações de exemplo (substituídas pelo cotacao-worker em produção)
insert into public.cotacoes_cache (commodity, fonte, preco, unidade, variacao_pct, tipo) values
  ('soja',  'cepea', 128.50, 'R$/saca', 1.2,  'spot'),
  ('milho', 'cepea', 62.30,  'R$/saca', -0.4, 'spot'),
  ('cafe',  'cepea', 1450.00,'R$/saca', 2.8,  'spot'),
  ('boi',   'cepea', 245.00, 'R$/@',    0.6,  'spot');

-- Câmbio de exemplo
insert into public.cambio_cache (par, cotacao, variacao_pct) values
  ('USD/BRL', 5.42, 0.3),
  ('EUR/BRL', 5.88, 0.1);

-- Sinal de IA de exemplo (substituído pelo sinal-ia-worker)
insert into public.sinais_ia (commodity, sinal, recomendacao, justificativa, fatores, confianca) values
  ('soja', 'VENDER', 'VENDER PARCIAL 30%',
   'A soja está 8% acima da média de fevereiro dos últimos 5 anos e o dólar está firme. Bom momento para fixar parte da produção.',
   '{"tendencia":"alta","sazonalidade":"favoravel","fundos":"reduzindo_compra","cambio":"firme"}'::jsonb,
   0.74),
  ('milho', 'AGUARDAR', 'AGUARDAR',
   'Preço lateral e abaixo da média. Sem gatilho claro de venda no curto prazo.',
   '{"tendencia":"lateral","sazonalidade":"neutra"}'::jsonb,
   0.61);

-- NOTA: cooperados de teste devem ser criados via Supabase Auth (signup), pois
-- public.cooperados.id referencia auth.users(id). Crie um usuário no Studio local
-- e insira o registro correspondente vinculado à 'Cooperativa Demo'.
