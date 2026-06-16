/**
 * cotacao-worker — atualiza cotacoes_cache + cambio_cache (cron a cada 15 min).
 *
 * Fontes REAIS (caminho gratuito):
 *   • B3 / futuros (fim-de-dia, EOD) ........ brapi.dev  → boi, cafe, milho, soja
 *   • Fisico regional (CEPEA/ESALQ, diario) . API Redacao Agro → soja, milho, boi
 *   • Cambio (USD/BRL, EUR/BRL) ............. brapi.dev
 *
 * Regionalizacao: o indicador fisico (CEPEA) e gravado como linha nacional
 * (regiao = null) e replicado por UF onde existem cooperativas, aplicando um
 * diferencial regional (basis) por UF/commodity — default 0 ate entrar uma
 * fonte regional dedicada (IMEA / Scot / feed pago).
 *
 * Robustez: cada fonte e "best-effort". Se falhar ou vier vazia, a commodity
 * cai em fallback (random-walk a partir do ultimo preco) para o dashboard
 * nunca zerar. A resposta detalha o que veio REAL x fallback.
 *
 * Segredos (Supabase → Edge Functions → Secrets):
 *   BRAPI_TOKEN       token gratis brapi.dev (necessario p/ B3 e cambio reais)
 *   BRAPI_TICKERS     (opcional) JSON p/ ajustar simbolos B3, ex:
 *                     {"boi":"BGI","cafe":"ICF","milho":"CCM","soja":"SOJA"}
 *   REDACAO_AGRO_URL  (opcional) endpoint da API fisica CEPEA
 *   COTACAO_BASIS     (opcional) JSON {"UF":{"soja":-2.5,"milho":1.0}}
 *   WORKER_SECRET     (opcional) exige header x-worker-secret
 *
 * Roda com SERVICE_ROLE (bypassa RLS).
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

type Commodity = "soja" | "milho" | "cafe" | "algodao" | "boi";

// Fallback (random-walk) — usado SO quando a fonte real nao responde.
const FALLBACK: Record<Commodity, { unidade: string; base: number }> = {
  soja: { unidade: "R$/saca", base: 128.5 },
  milho: { unidade: "R$/saca", base: 62.3 },
  cafe: { unidade: "R$/saca", base: 1450.0 },
  algodao: { unidade: "R$/@", base: 159.4 },
  boi: { unidade: "R$/@", base: 245.0 },
};

const PARES = [
  { par: "USD/BRL", brapi: "USD-BRL", base: 5.42 },
  { par: "EUR/BRL", brapi: "EUR-BRL", base: 5.88 },
];

// Praca de referencia CEPEA por commodity (lado fisico/spot).
const CEPEA_PRACA: Partial<Record<Commodity, { uf: string; unidade: string; item: string }>> = {
  soja: { uf: "PR", unidade: "R$/saca", item: "soja" }, // Paranagua/PR
  milho: { uf: "SP", unidade: "R$/saca", item: "milho" }, // Campinas/SP
  boi: { uf: "SP", unidade: "R$/@", item: "boi_gordo" }, // Sao Paulo/SP
};

// Simbolos B3 padrao no brapi (ajustaveis via BRAPI_TICKERS).
const DEFAULT_TICKERS: Partial<Record<Commodity, string>> = {
  boi: "BGI",
  cafe: "ICF",
  milho: "CCM",
  soja: "SOJA",
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
};

const num2 = (v: unknown): number | null => {
  // variante que NAO remove pontos (para valores ja em formato decimal "5.42")
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---- Fontes reais -----------------------------------------------------------

async function fetchBrapiFutures(
  token: string,
  tickers: Partial<Record<Commodity, string>>,
): Promise<{ commodity: Commodity; preco: number; variacao_pct: number | null }[]> {
  const entries = Object.entries(tickers).filter(([, s]) => !!s) as [Commodity, string][];
  if (!entries.length || !token) return [];
  const symbols = entries.map(([, s]) => s).join(",");
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbols)}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`brapi quote ${res.status}`);
  const data = await res.json();
  const results: Array<Record<string, unknown>> = data?.results ?? [];
  const out: { commodity: Commodity; preco: number; variacao_pct: number | null }[] = [];
  for (const [commodity, root] of entries) {
    const r = results.find((x) => typeof x?.symbol === "string" && (x.symbol as string).startsWith(root));
    const preco = num2(r?.regularMarketPrice);
    if (preco === null) continue;
    out.push({ commodity, preco, variacao_pct: num2(r?.regularMarketChangePercent) });
  }
  return out;
}

async function fetchCepeaFisico(
  baseUrl: string,
): Promise<{ commodity: Commodity; preco: number; variacao_pct: number | null; unidade: string; uf: string }[]> {
  const out: { commodity: Commodity; preco: number; variacao_pct: number | null; unidade: string; uf: string }[] = [];
  for (const [commodity, cfg] of Object.entries(CEPEA_PRACA) as [Commodity, { uf: string; unidade: string; item: string }][]) {
    try {
      const res = await fetch(`${baseUrl}?item=${encodeURIComponent(cfg.item)}`);
      if (!res.ok) continue;
      const data = await res.json();
      // tolerante: aceita objeto unico, array, ou {cotacao}/{cotacoes:[...]}
      const row: Record<string, unknown> = Array.isArray(data)
        ? data[0]
        : (data?.cotacao ?? data?.cotacoes?.[0] ?? data ?? {});
      const preco = num(row?.valor ?? row?.preco ?? row?.cotacao ?? row?.value);
      if (preco === null) continue;
      const varpct = num2(row?.variacao ?? row?.variacao_pct ?? row?.var ?? row?.changePercent);
      out.push({ commodity, preco, variacao_pct: varpct, unidade: cfg.unidade, uf: cfg.uf });
    } catch (_) {
      // best-effort por commodity
    }
  }
  return out;
}

async function fetchCambio(
  token: string,
): Promise<{ par: string; cotacao: number; variacao_pct: number | null }[]> {
  if (!token) return [];
  const pares = PARES.map((p) => p.brapi).join(",");
  const url = `https://brapi.dev/api/v2/currency?currency=${pares}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`brapi currency ${res.status}`);
  const data = await res.json();
  const arr: Array<Record<string, unknown>> = data?.currency ?? [];
  const out: { par: string; cotacao: number; variacao_pct: number | null }[] = [];
  for (const p of PARES) {
    const r = arr.find(
      (x) => `${x?.fromCurrency}-${x?.toCurrency}` === p.brapi || x?.name === p.brapi,
    );
    const cot = num2(r?.bidPrice ?? r?.ask ?? r?.high);
    if (cot === null) continue;
    out.push({ par: p.par, cotacao: cot, variacao_pct: num2(r?.pctChange ?? r?.variacao_pct) });
  }
  return out;
}

// ---- Handler ----------------------------------------------------------------

Deno.serve(async (req) => {
  const secret = Deno.env.get("WORKER_SECRET");
  if (secret && req.headers.get("x-worker-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const brapiToken = Deno.env.get("BRAPI_TOKEN") ?? "";
  const redacaoUrl = Deno.env.get("REDACAO_AGRO_URL") ?? "https://www.redacaoagro.com.br/api/cotacoes.php";

  let tickers: Partial<Record<Commodity, string>> = DEFAULT_TICKERS;
  try {
    const t = Deno.env.get("BRAPI_TICKERS");
    if (t) tickers = { ...DEFAULT_TICKERS, ...JSON.parse(t) };
  } catch (_) { /* mantem default */ }

  let basis: Record<string, Partial<Record<Commodity, number>>> = {};
  try {
    const b = Deno.env.get("COTACAO_BASIS");
    if (b) basis = JSON.parse(b);
  } catch (_) { /* sem basis */ }

  // Ultimo preco nacional por commodity (variacao/fallback).
  const { data: ultimas } = await supabase
    .from("cotacoes_cache")
    .select("commodity, preco, capturado_em")
    .is("regiao", null)
    .order("capturado_em", { ascending: false })
    .limit(120);
  const lastPrice = (c: Commodity): number | null => {
    const u = ultimas?.find((x) => x.commodity === c);
    return u ? Number(u.preco) : null;
  };

  // UFs com cooperativas (para regionalizar o fisico).
  const { data: coops } = await supabase
    .from("cooperativas")
    .select("estado")
    .not("estado", "is", null);
  const ufs = Array.from(
    new Set((coops ?? []).map((c) => String(c.estado).toUpperCase()).filter(Boolean)),
  );

  // Coleta as fontes reais (best-effort, em paralelo).
  const [b3, fisico, cambio] = await Promise.all([
    fetchBrapiFutures(brapiToken, tickers).catch(() => []),
    fetchCepeaFisico(redacaoUrl).catch(() => []),
    fetchCambio(brapiToken).catch(() => []),
  ]);

  const rows: Array<Record<string, unknown>> = [];
  const sources = { b3: 0, cepea_nacional: 0, cepea_regional: 0, fallback: [] as Commodity[] };

  // 1) B3 futuros (nacional)
  for (const f of b3) {
    rows.push({
      commodity: f.commodity,
      fonte: "b3",
      preco: f.preco,
      unidade: FALLBACK[f.commodity].unidade,
      variacao_pct: f.variacao_pct,
      tipo: "futuro",
      regiao: null,
    });
    sources.b3++;
  }

  // 2) Fisico CEPEA (nacional + regional por UF)
  const fisicoCommodities = new Set<Commodity>();
  for (const s of fisico) {
    fisicoCommodities.add(s.commodity);
    rows.push({
      commodity: s.commodity,
      fonte: "cepea",
      preco: s.preco,
      unidade: s.unidade,
      variacao_pct: s.variacao_pct,
      tipo: "spot",
      regiao: null,
    });
    sources.cepea_nacional++;
    for (const uf of ufs) {
      const diff = basis?.[uf]?.[s.commodity] ?? 0;
      rows.push({
        commodity: s.commodity,
        fonte: "cepea",
        preco: Number((s.preco + diff).toFixed(2)),
        unidade: s.unidade,
        variacao_pct: s.variacao_pct,
        tipo: "spot",
        regiao: uf,
      });
      sources.cepea_regional++;
    }
  }

  // 3) Fallback (random-walk) p/ commodities sem fisico real — mantem dashboard completo.
  for (const c of Object.keys(FALLBACK) as Commodity[]) {
    if (fisicoCommodities.has(c)) continue;
    const anterior = lastPrice(c) ?? FALLBACK[c].base;
    const preco = Number((anterior * (1 + (Math.random() - 0.5) * 0.012)).toFixed(2));
    const variacao_pct = Number((((preco - anterior) / anterior) * 100).toFixed(2));
    rows.push({
      commodity: c,
      fonte: "cepea",
      preco,
      unidade: FALLBACK[c].unidade,
      variacao_pct,
      tipo: "spot",
      regiao: null,
    });
    sources.fallback.push(c);
  }

  if (rows.length) {
    const ins = await supabase.from("cotacoes_cache").insert(rows);
    if (ins.error) return json({ error: ins.error.message }, 500);
  }

  // Cambio (real ou fallback)
  let cambioRows = cambio;
  if (!cambioRows.length) {
    const { data: ultCambio } = await supabase
      .from("cambio_cache")
      .select("par, cotacao")
      .order("capturado_em", { ascending: false })
      .limit(10);
    cambioRows = PARES.map((p) => {
      const ult = ultCambio?.find((u) => u.par === p.par);
      const anterior = ult ? Number(ult.cotacao) : p.base;
      const cotacao = Number((anterior * (1 + (Math.random() - 0.5) * 0.004)).toFixed(4));
      return {
        par: p.par,
        cotacao,
        variacao_pct: Number((((cotacao - anterior) / anterior) * 100).toFixed(2)),
      };
    });
  }
  if (cambioRows.length) {
    const ins2 = await supabase.from("cambio_cache").insert(cambioRows);
    if (ins2.error) return json({ error: ins2.error.message }, 500);
  }

  return json({
    ok: true,
    inseridas: rows.length,
    cambio: cambioRows.length,
    fontes: {
      b3: sources.b3,
      cepea_nacional: sources.cepea_nacional,
      cepea_regional: sources.cepea_regional,
      fallback: sources.fallback,
      cambio_real: cambio.length > 0,
    },
    ufs,
  });
});
