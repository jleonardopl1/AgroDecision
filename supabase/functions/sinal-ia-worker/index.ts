/**
 * sinal-ia-worker — gera o sinal de timing de venda (F06) por commodity → sinais_ia.
 *
 * REGRA CRÍTICA: roda por COMMODITY/HORA, NUNCA por usuário.
 * Custo de IA fixo → protege a margem bruta (> 80%). Spec: docs/AI_TIMING_ENGINE.md.
 *
 * Com ANTHROPIC_API_KEY definida: chama a Claude API (claude-sonnet-4-6) com
 * structured outputs (JSON garantido). Sem a chave: heurística determinística
 * de fallback (nunca deixa o dashboard sem sinal).
 *
 * Proteção: verify_jwt habilitado no deploy + header opcional x-worker-secret.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

type Sinal = "VENDER" | "AGUARDAR" | "ATENCAO";

interface FatoresMercado {
  commodity: string;
  precoAtual: number;
  unidade: string;
  variacao30d: number;
  mediaJanela30d: number; // proxy da média sazonal até integrarmos 5 anos de histórico
  posicaoFundos: "comprando" | "reduzindo_compra" | "vendendo" | "neutro";
  cambioUsdBrl: number;
  cambioVariacao30d: number;
}

interface ResultadoSinal {
  sinal: Sinal;
  recomendacao: string;
  justificativa: string;
  fatores: Record<string, string>;
  confianca: number;
}

const SYSTEM_PROMPT = `Você é o analista de mercado do AgroDecision, especialista em
comercialização de grãos e pecuária no Brasil. Seu trabalho é dar ao produtor rural
uma recomendação CLARA e ACIONÁVEL sobre o momento de venda.

REGRAS:
- Use linguagem do campo, simples e direta. NUNCA jargão financeiro (nada de "EBITDA",
  "basis", "hedge ratio"). Fale como um agrônomo experiente falaria com o produtor.
- A justificativa deve ter no máximo 2 frases e citar o motivo concreto.
- Seja conservador: na dúvida entre VENDER e AGUARDAR, prefira recomendar venda PARCIAL.

SINAIS POSSÍVEIS:
- "VENDER": condições favoráveis para fixar produção (preço acima da média, câmbio firme).
- "AGUARDAR": sem gatilho claro; preço lateral ou tendência de alta consistente.
- "ATENCAO": volatilidade ou risco que exige acompanhamento (queda, reversão, evento).`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sinal: { type: "string", enum: ["VENDER", "AGUARDAR", "ATENCAO"] },
    recomendacao: {
      type: "string",
      description: "Curta e acionável, ex: 'VENDER PARCIAL 30%' ou 'AGUARDAR'",
    },
    justificativa: { type: "string", description: "1-2 frases em linguagem do campo" },
    fatores: {
      type: "object",
      additionalProperties: false,
      properties: {
        tendencia: { type: "string" },
        sazonalidade: { type: "string" },
        fundos: { type: "string" },
        cambio: { type: "string" },
      },
      required: ["tendencia", "sazonalidade", "fundos", "cambio"],
    },
    confianca: { type: "number", description: "0 a 1" },
  },
  required: ["sinal", "recomendacao", "justificativa", "fatores", "confianca"],
} as const;

/** Fallback determinístico quando a Claude API não está disponível. */
function sinalHeuristico(f: FatoresMercado): ResultadoSinal {
  const acimaDaMedia = ((f.precoAtual - f.mediaJanela30d) / f.mediaJanela30d) * 100;
  const cambioFirme = f.cambioVariacao30d >= 0;

  if (f.variacao30d <= -5) {
    return {
      sinal: "ATENCAO",
      recomendacao: "ATENÇÃO",
      justificativa:
        `O preço caiu ${Math.abs(f.variacao30d).toFixed(1)}% no último mês. Acompanhe o mercado antes de fechar negócio.`,
      fatores: {
        tendencia: "queda",
        sazonalidade: "neutra",
        fundos: f.posicaoFundos,
        cambio: cambioFirme ? "firme" : "fraco",
      },
      confianca: 0.6,
    };
  }
  if (f.variacao30d >= 4 && acimaDaMedia >= 2 && cambioFirme) {
    return {
      sinal: "VENDER",
      recomendacao: "VENDER PARCIAL 30%",
      justificativa:
        `O preço subiu ${f.variacao30d.toFixed(1)}% no mês e está acima da média recente, com dólar firme. Bom momento para fixar parte da produção.`,
      fatores: { tendencia: "alta", sazonalidade: "favoravel", fundos: f.posicaoFundos, cambio: "firme" },
      confianca: 0.65,
    };
  }
  return {
    sinal: "AGUARDAR",
    recomendacao: "AGUARDAR",
    justificativa: "Preço sem gatilho claro de venda no curto prazo. Sem pressa para fixar.",
    fatores: {
      tendencia: "lateral",
      sazonalidade: "neutra",
      fundos: f.posicaoFundos,
      cambio: cambioFirme ? "firme" : "fraco",
    },
    confianca: 0.55,
  };
}

async function gerarSinalIA(client: Anthropic, f: FatoresMercado): Promise<ResultadoSinal> {
  const userPrompt = JSON.stringify(
    {
      commodity: f.commodity,
      preco_atual: `${f.precoAtual} ${f.unidade}`,
      variacao_30_dias_pct: f.variacao30d,
      media_30_dias: f.mediaJanela30d,
      posicao_fundos: f.posicaoFundos,
      cambio_usd_brl: f.cambioUsdBrl,
      cambio_variacao_30d_pct: f.cambioVariacao30d,
    },
    null,
    2,
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Analise os dados de mercado abaixo e gere a recomendação de timing.\n\n${userPrompt}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude API recusou a requisição");
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();

  const parsed = JSON.parse(text) as ResultadoSinal;
  if (!["VENDER", "AGUARDAR", "ATENCAO"].includes(parsed.sinal)) {
    throw new Error(`Sinal inválido: ${parsed.sinal}`);
  }
  return parsed;
}

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

  // Cotações atuais (primeira ocorrência por commodity = mais recente).
  // Sempre spot/nacional — a mesma série que o produtor vê no dashboard.
  const { data: atuais, error: e1 } = await supabase
    .from("cotacoes_cache")
    .select("commodity, preco, unidade, capturado_em")
    .eq("tipo", "spot")
    .is("regiao", null)
    .order("capturado_em", { ascending: false })
    .limit(60);
  if (e1) return json({ error: e1.message }, 500);

  // Preços ~30 dias atrás (mais recentes entre os com mais de 28 dias)
  const corte = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const { data: antigos, error: e2 } = await supabase
    .from("cotacoes_cache")
    .select("commodity, preco, capturado_em")
    .eq("tipo", "spot")
    .is("regiao", null)
    .lt("capturado_em", corte)
    .order("capturado_em", { ascending: false })
    .limit(30);
  if (e2) return json({ error: e2.message }, 500);

  // Média da janela de 30 dias (proxy de sazonalidade)
  const { data: janela, error: e3 } = await supabase
    .from("cotacoes_cache")
    .select("commodity, preco")
    .eq("tipo", "spot")
    .is("regiao", null)
    .gte("capturado_em", new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString())
    .limit(2000);
  if (e3) return json({ error: e3.message }, 500);

  // Câmbio atual e ~30d atrás
  const { data: cambioAtual } = await supabase
    .from("cambio_cache")
    .select("par, cotacao")
    .eq("par", "USD/BRL")
    .order("capturado_em", { ascending: false })
    .limit(1);
  const { data: cambioAntigo } = await supabase
    .from("cambio_cache")
    .select("par, cotacao")
    .eq("par", "USD/BRL")
    .lt("capturado_em", corte)
    .order("capturado_em", { ascending: false })
    .limit(1);

  const usdAtual = cambioAtual?.[0] ? Number(cambioAtual[0].cotacao) : 5.4;
  const usdAntigo = cambioAntigo?.[0] ? Number(cambioAntigo[0].cotacao) : usdAtual;
  const cambioVar30d = Number((((usdAtual - usdAntigo) / usdAntigo) * 100).toFixed(2));

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

  const commodities = ["soja", "milho", "cafe", "algodao", "boi"];
  const resultados: Array<Record<string, unknown>> = [];

  for (const cm of commodities) {
    const atual = atuais?.find((c) => c.commodity === cm);
    if (!atual) continue;

    const antigo = antigos?.find((c) => c.commodity === cm);
    const precoAtual = Number(atual.preco);
    const precoAntigo = antigo ? Number(antigo.preco) : precoAtual;
    const precosJanela = (janela ?? [])
      .filter((c) => c.commodity === cm)
      .map((c) => Number(c.preco));
    const media = precosJanela.length
      ? precosJanela.reduce((a, b) => a + b, 0) / precosJanela.length
      : precoAtual;

    const fatores: FatoresMercado = {
      commodity: cm,
      precoAtual,
      unidade: atual.unidade,
      variacao30d: Number((((precoAtual - precoAntigo) / precoAntigo) * 100).toFixed(2)),
      mediaJanela30d: Number(media.toFixed(2)),
      posicaoFundos: "neutro", // TODO: integrar dados CFTC/B3
      cambioUsdBrl: usdAtual,
      cambioVariacao30d: cambioVar30d,
    };

    let resultado: ResultadoSinal;
    let modelo: string;
    if (anthropic) {
      try {
        resultado = await gerarSinalIA(anthropic, fatores);
        modelo = "claude-sonnet-4-6";
      } catch (err) {
        console.error(`[sinal-ia-worker] Claude API falhou p/ ${cm}, usando heurística:`, err);
        resultado = sinalHeuristico(fatores);
        modelo = "heuristica-v1";
      }
    } else {
      resultado = sinalHeuristico(fatores);
      modelo = "heuristica-v1";
    }

    resultados.push({
      commodity: cm,
      sinal: resultado.sinal,
      recomendacao: resultado.recomendacao,
      justificativa: resultado.justificativa,
      fatores: resultado.fatores,
      confianca: resultado.confianca,
      modelo,
    });
  }

  if (resultados.length > 0) {
    const { error: insErr } = await supabase.from("sinais_ia").insert(resultados);
    if (insErr) return json({ error: insErr.message }, 500);
  }

  return json({
    ok: true,
    gerados: resultados.length,
    modelo: anthropic ? "claude-sonnet-4-6" : "heuristica-v1",
  });
});
