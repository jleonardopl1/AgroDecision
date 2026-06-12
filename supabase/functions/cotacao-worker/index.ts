/**
 * cotacao-worker — atualiza cotacoes_cache + cambio_cache a cada 15 min.
 *
 * A integração oficial CEPEA/B3 exige licenciamento de dados; até ela entrar,
 * o worker opera em "modo demo": gera um passo de random walk suave a partir
 * do último preço de cada commodity, mantendo o dashboard vivo.
 * Roda com service_role (bypassa RLS).
 *
 * Proteção: verify_jwt habilitado no deploy + header opcional x-worker-secret
 * (validado quando a env WORKER_SECRET está definida).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const COMMODITIES = [
  { commodity: "soja", unidade: "R$/saca", base: 128.5 },
  { commodity: "milho", unidade: "R$/saca", base: 62.3 },
  { commodity: "cafe", unidade: "R$/saca", base: 1450.0 },
  { commodity: "algodao", unidade: "R$/@", base: 159.4 },
  { commodity: "boi", unidade: "R$/@", base: 245.0 },
];

const PARES = [
  { par: "USD/BRL", base: 5.42 },
  { par: "EUR/BRL", base: 5.88 },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("WORKER_SECRET");
  if (secret && req.headers.get("x-worker-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Último preço conhecido por commodity (passo anterior do random walk)
  const { data: ultimas, error: errUltimas } = await supabase
    .from("cotacoes_cache")
    .select("commodity, preco")
    .order("capturado_em", { ascending: false })
    .limit(60);
  if (errUltimas) return json({ error: errUltimas.message }, 500);

  const cotacoes = COMMODITIES.map((c) => {
    const ult = ultimas?.find((u) => u.commodity === c.commodity);
    const anterior = ult ? Number(ult.preco) : c.base;
    // passo de ±0,6% — volatilidade plausível p/ janela de 15min
    const preco = Number((anterior * (1 + (Math.random() - 0.5) * 0.012)).toFixed(2));
    const variacao_pct = Number((((preco - anterior) / anterior) * 100).toFixed(2));
    return { commodity: c.commodity, fonte: "cepea", preco, unidade: c.unidade, variacao_pct, tipo: "spot" };
  });

  const { data: ultimosCambios, error: errCambio } = await supabase
    .from("cambio_cache")
    .select("par, cotacao")
    .order("capturado_em", { ascending: false })
    .limit(10);
  if (errCambio) return json({ error: errCambio.message }, 500);

  const cambios = PARES.map((p) => {
    const ult = ultimosCambios?.find((u) => u.par === p.par);
    const anterior = ult ? Number(ult.cotacao) : p.base;
    const cotacao = Number((anterior * (1 + (Math.random() - 0.5) * 0.004)).toFixed(4));
    const variacao_pct = Number((((cotacao - anterior) / anterior) * 100).toFixed(2));
    return { par: p.par, cotacao, variacao_pct };
  });

  const ins1 = await supabase.from("cotacoes_cache").insert(cotacoes);
  if (ins1.error) return json({ error: ins1.error.message }, 500);

  const ins2 = await supabase.from("cambio_cache").insert(cambios);
  if (ins2.error) return json({ error: ins2.error.message }, 500);

  return json({ ok: true, cotacoes: cotacoes.length, cambios: cambios.length, modo: "demo-random-walk" });
});
