/**
 * chatbot — assistente comercial do AgroDecision (F09).
 *
 * Conversa com o produtor (app, WhatsApp ou Telegram), entrevista o cenário
 * comercial dele, registra produção/fixações, simula venda ("se eu vender hoje,
 * quanto recebo?") e configura alertas — tudo em linguagem do campo.
 *
 * Dois modos de chamada:
 *  - App:     Authorization: Bearer <jwt do cooperado>            (canal = app)
 *  - Webhook: header x-worker-secret + body { cooperado_id, canal } (service role)
 *
 * Com ANTHROPIC_API_KEY usa a Claude API (claude-sonnet-4-6) com tool use;
 * sem a chave, responde de forma determinística a partir do cenário calculado.
 */
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const COMMODITIES = ["soja", "milho", "cafe", "algodao", "boi"] as const;
type Commodity = (typeof COMMODITIES)[number];
const SAFRA_PADRAO = "2025/26";
const MODELO = "claude-sonnet-4-6";
const MAX_TURNS = 6;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function isCommodity(v: unknown): v is Commodity {
  return typeof v === "string" && (COMMODITIES as readonly string[]).includes(v);
}
function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Cenário comercial (espelha src/lib/simulador.ts)
// ---------------------------------------------------------------------------
interface Cenario {
  nome: string;
  culturas: string[];
  areaHa: number | null;
  precoSpot: Record<string, { preco: number; unidade: string; variacao: number | null }>;
  sinais: Record<string, { sinal: string; recomendacao: string; justificativa: string }>;
  usdBrl: number | null;
  custos: Array<{ commodity: string; safra: string; custo_por_saca: number }>;
  carteira: Array<{
    commodity: string;
    safra: string;
    producaoSacas: number | null;
    fixadoSacas: number;
    restanteSacas: number | null;
    pctVendido: number | null;
    precoMedioFixado: number | null;
  }>;
}

function firstByKey<T>(rows: T[], key: (r: T) => string): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}

async function montarCenario(supabase: SupabaseClient, cooperadoId: string): Promise<Cenario> {
  const [coop, custosR, prodR, fixR, cotR, sinR, camR] = await Promise.all([
    supabase.from("cooperados").select("nome, culturas, area_ha").eq("id", cooperadoId).maybeSingle(),
    supabase.from("custos_producao").select("commodity, safra, custo_por_saca").eq("cooperado_id", cooperadoId),
    supabase.from("producoes").select("commodity, safra, producao_sacas").eq("cooperado_id", cooperadoId),
    supabase.from("fixacoes").select("commodity, safra, sacas, preco").eq("cooperado_id", cooperadoId),
    supabase.from("cotacoes_cache").select("commodity, preco, unidade, variacao_pct, capturado_em")
      .eq("tipo", "spot").is("regiao", null).order("capturado_em", { ascending: false }).limit(60),
    supabase.from("sinais_ia").select("commodity, sinal, recomendacao, justificativa, gerado_em")
      .order("gerado_em", { ascending: false }).limit(60),
    supabase.from("cambio_cache").select("par, cotacao, capturado_em")
      .eq("par", "USD/BRL").order("capturado_em", { ascending: false }).limit(1),
  ]);

  const cot = firstByKey(cotR.data ?? [], (c) => c.commodity);
  const sin = firstByKey(sinR.data ?? [], (s) => s.commodity);

  const precoSpot: Cenario["precoSpot"] = {};
  for (const [k, c] of cot) {
    precoSpot[k] = { preco: Number(c.preco), unidade: c.unidade, variacao: c.variacao_pct === null ? null : Number(c.variacao_pct) };
  }
  const sinais: Cenario["sinais"] = {};
  for (const [k, s] of sin) {
    sinais[k] = { sinal: s.sinal, recomendacao: s.recomendacao, justificativa: s.justificativa };
  }

  // Carteira: produção − fixado
  const prodMap = firstByKey(prodR.data ?? [], (p) => `${p.commodity}::${p.safra}`);
  const carteiraMap = new Map<string, Cenario["carteira"][number]>();
  for (const [k, p] of prodMap) {
    carteiraMap.set(k, {
      commodity: p.commodity, safra: p.safra,
      producaoSacas: p.producao_sacas === null ? null : Number(p.producao_sacas),
      fixadoSacas: 0, restanteSacas: null, pctVendido: null, precoMedioFixado: null,
    });
  }
  for (const f of fixR.data ?? []) {
    const k = `${f.commodity}::${f.safra}`;
    let pos = carteiraMap.get(k);
    if (!pos) {
      pos = { commodity: f.commodity, safra: f.safra, producaoSacas: null, fixadoSacas: 0, restanteSacas: null, pctVendido: null, precoMedioFixado: null };
      carteiraMap.set(k, pos);
    }
    pos.fixadoSacas += Number(f.sacas);
    pos.precoMedioFixado = (pos.precoMedioFixado ?? 0) + Number(f.sacas) * Number(f.preco); // acumula receita; vira média abaixo
  }
  for (const pos of carteiraMap.values()) {
    const receita = pos.precoMedioFixado ?? 0;
    pos.precoMedioFixado = pos.fixadoSacas > 0 ? receita / pos.fixadoSacas : null;
    if (pos.producaoSacas !== null && pos.producaoSacas > 0) {
      pos.restanteSacas = Math.max(0, pos.producaoSacas - pos.fixadoSacas);
      pos.pctVendido = Math.min(1, pos.fixadoSacas / pos.producaoSacas);
    }
  }

  return {
    nome: coop.data?.nome ?? "produtor",
    culturas: (coop.data?.culturas ?? []) as string[],
    areaHa: coop.data?.area_ha === null || coop.data?.area_ha === undefined ? null : Number(coop.data.area_ha),
    precoSpot,
    sinais,
    usdBrl: camR.data?.[0] ? Number(camR.data[0].cotacao) : null,
    custos: (custosR.data ?? []).map((c) => ({ commodity: c.commodity, safra: c.safra, custo_por_saca: Number(c.custo_por_saca) })),
    carteira: [...carteiraMap.values()],
  };
}

function cenarioParaTexto(c: Cenario): string {
  const linhas: string[] = [];
  linhas.push(`Produtor: ${c.nome}. Culturas declaradas: ${c.culturas.join(", ") || "nenhuma ainda"}. Área: ${c.areaHa ?? "não informada"} ha.`);
  linhas.push(`Dólar USD/BRL: ${c.usdBrl ?? "—"}.`);
  linhas.push("Cotações spot (R$/unidade, variação diária):");
  for (const [k, p] of Object.entries(c.precoSpot)) {
    linhas.push(`  - ${k}: ${p.preco} ${p.unidade} (${p.variacao ?? 0}%).`);
  }
  if (Object.keys(c.sinais).length) {
    linhas.push("Sinais de IA atuais:");
    for (const [k, s] of Object.entries(c.sinais)) linhas.push(`  - ${k}: ${s.sinal} — ${s.recomendacao}. ${s.justificativa}`);
  }
  if (c.custos.length) {
    linhas.push("Custos por saca informados:");
    for (const x of c.custos) linhas.push(`  - ${x.commodity} ${x.safra}: R$ ${x.custo_por_saca}/saca.`);
  } else {
    linhas.push("Nenhum custo de produção informado ainda.");
  }
  if (c.carteira.length) {
    linhas.push("Carteira (produção, fixado, restante, % vendido, preço médio fixado):");
    for (const p of c.carteira) {
      linhas.push(
        `  - ${p.commodity} ${p.safra}: produção ${p.producaoSacas ?? "?"} sc, fixado ${p.fixadoSacas} sc` +
          `${p.restanteSacas !== null ? `, restam ${p.restanteSacas} sc` : ""}` +
          `${p.pctVendido !== null ? `, ${Math.round(p.pctVendido * 100)}% vendido` : ""}` +
          `${p.precoMedioFixado !== null ? `, preço médio R$ ${p.precoMedioFixado.toFixed(2)}` : ""}.`,
      );
    }
  } else {
    linhas.push("Carteira vazia — nenhuma produção ou fixação registrada.");
  }
  return linhas.join("\n");
}

const SYSTEM_BASE = `Você é o consultor comercial do AgroDecision, um especialista em comercialização
de grãos e pecuária que conversa com o produtor rural brasileiro pelo celular.

SEU OBJETIVO: ajudar o produtor a vender melhor. Construa, ao longo da conversa, um cenário comercial
completo dele e entregue análises, alertas e indicações de mercado em nível profissional, em tempo real.

COMO CONVERSAR:
- Linguagem do campo, simples, calorosa e direta. Trate o produtor pelo nome. NADA de jargão financeiro
  ("hedge", "basis", "EBITDA"). Fale como um agrônomo de confiança falaria no WhatsApp.
- Respostas curtas (cabem na tela do celular). Use no máximo 1 emoji quando fizer sentido.
- Se faltam dados para uma boa recomendação, faça UMA pergunta de cada vez, na ordem que mais ajuda o
  produtor a ganhar dinheiro: cultura → área → produção esperada → custo por saca → margem desejada →
  quanto já fixou → que alertas quer receber.
- Quando o produtor informar um dado (custo, produção, uma fixação que fez, uma meta), REGISTRE com a
  ferramenta apropriada antes de responder, e confirme em uma frase.
- Para "se eu vender hoje, quanto recebo?", "quanto já fixei?", "quanto falta vender?", use as ferramentas
  e responda com números concretos (R$ e %).
- Seja conservador e transparente: explique o porquê em 1 frase, cite o gatilho concreto (preço acima da
  média, dólar firme, etc.). Na dúvida entre vender e aguardar, sugira venda PARCIAL.

Use as ferramentas sempre que envolverem dados do produtor. Depois de usá-las, dê a resposta final em texto.`;

const TOOLS = [
  {
    name: "registrar_producao",
    description: "Registra/atualiza a produção esperada e metas de uma cultura/safra do produtor.",
    input_schema: {
      type: "object", additionalProperties: false,
      properties: {
        commodity: { type: "string", enum: COMMODITIES },
        safra: { type: "string", description: "ex '2025/26'; se omitido usa a safra atual" },
        producao_sacas: { type: "number", description: "produção total esperada em sacas/arrobas" },
        area_ha: { type: "number" },
        preco_alvo: { type: "number", description: "R$/saca que o produtor quer atingir" },
        margem_alvo_pct: { type: "number", description: "margem % desejada sobre o custo" },
      },
      required: ["commodity"],
    },
  },
  {
    name: "registrar_fixacao",
    description: "Registra uma fixação/venda parcial que o produtor já fez (ele esquece quanto fixou).",
    input_schema: {
      type: "object", additionalProperties: false,
      properties: {
        commodity: { type: "string", enum: COMMODITIES },
        safra: { type: "string" },
        sacas: { type: "number", description: "sacas/arrobas fixadas neste contrato" },
        preco: { type: "number", description: "R$/saca fixado" },
        observacao: { type: "string" },
      },
      required: ["commodity", "sacas", "preco"],
    },
  },
  {
    name: "simular_venda",
    description: "Simula 'se eu vender hoje, quanto recebo?': receita e lucro de vender N sacas ao preço atual (ou a um preço informado).",
    input_schema: {
      type: "object", additionalProperties: false,
      properties: {
        commodity: { type: "string", enum: COMMODITIES },
        safra: { type: "string" },
        sacas: { type: "number", description: "sacas a vender; se omitido, usa o restante em aberto da carteira" },
        preco: { type: "number", description: "R$/saca; se omitido, usa a cotação spot atual" },
      },
      required: ["commodity"],
    },
  },
  {
    name: "criar_alerta",
    description: "Cria um alerta de mercado para avisar o produtor quando um gatilho bater.",
    input_schema: {
      type: "object", additionalProperties: false,
      properties: {
        tipo: { type: "string", enum: ["preco", "margem", "cambio", "sinal_ia"] },
        commodity: { type: "string", enum: COMMODITIES },
        par_cambio: { type: "string", enum: ["USD/BRL", "EUR/BRL"] },
        operador: { type: "string", enum: [">=", "<="], description: "subir para (>=) ou cair para (<=)" },
        valor_alvo: { type: "number" },
        whatsapp: { type: "boolean", description: "também enviar no WhatsApp" },
      },
      required: ["tipo"],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Execução das ferramentas (service role → escreve no banco)
// ---------------------------------------------------------------------------
async function execTool(
  supabase: SupabaseClient,
  cooperadoId: string,
  canal: string,
  cenario: Cenario,
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: unknown; simulacao?: unknown }> {
  const safra = (typeof input.safra === "string" && input.safra.trim()) || SAFRA_PADRAO;

  if (name === "registrar_producao") {
    if (!isCommodity(input.commodity)) return { result: { erro: "cultura inválida" } };
    const row: Record<string, unknown> = { cooperado_id: cooperadoId, commodity: input.commodity, safra };
    for (const c of ["producao_sacas", "area_ha", "preco_alvo", "margem_alvo_pct"] as const) {
      const v = num(input[c]);
      if (v !== null) row[c] = v;
    }
    const { error } = await supabase.from("producoes").upsert(row, { onConflict: "cooperado_id,commodity,safra" });
    return { result: error ? { erro: error.message } : { ok: true, ...row } };
  }

  if (name === "registrar_fixacao") {
    if (!isCommodity(input.commodity)) return { result: { erro: "cultura inválida" } };
    const sacas = num(input.sacas);
    const preco = num(input.preco);
    if (!sacas || sacas <= 0 || !preco || preco <= 0) return { result: { erro: "sacas e preço devem ser positivos" } };
    const { error } = await supabase.from("fixacoes").insert({
      cooperado_id: cooperadoId, commodity: input.commodity, safra, sacas, preco, canal,
      observacao: typeof input.observacao === "string" ? input.observacao : null,
    });
    if (error) return { result: { erro: error.message } };
    // Recalcula a posição para o modelo confirmar % vendido
    const { data: fx } = await supabase.from("fixacoes").select("sacas, preco").eq("cooperado_id", cooperadoId).eq("commodity", input.commodity).eq("safra", safra);
    const fixado = (fx ?? []).reduce((s, r) => s + Number(r.sacas), 0);
    const prod = cenario.carteira.find((p) => p.commodity === input.commodity && p.safra === safra)?.producaoSacas ?? null;
    return { result: { ok: true, commodity: input.commodity, safra, fixado_total_sacas: fixado, producao_sacas: prod, pct_vendido: prod ? Math.round((fixado / prod) * 100) : null } };
  }

  if (name === "simular_venda") {
    if (!isCommodity(input.commodity)) return { result: { erro: "cultura inválida" } };
    const spot = cenario.precoSpot[input.commodity];
    const preco = num(input.preco) ?? spot?.preco ?? null;
    if (preco === null) return { result: { erro: "sem cotação para esta cultura" } };
    const pos = cenario.carteira.find((p) => p.commodity === input.commodity && p.safra === safra);
    const sacas = num(input.sacas) ?? pos?.restanteSacas ?? null;
    if (sacas === null) return { result: { erro: "informe quantas sacas, ou registre a produção para usar o restante" } };
    const custo = cenario.custos.find((c) => c.commodity === input.commodity && c.safra === safra)?.custo_por_saca ?? null;
    const receita = sacas * preco;
    const margemPorSaca = custo !== null ? preco - custo : null;
    const lucro = margemPorSaca !== null ? margemPorSaca * sacas : null;
    const margemPct = custo !== null && custo > 0 ? ((preco - custo) / custo) * 100 : null;
    const sim = { commodity: input.commodity, safra, sacas, preco_usado: preco, receita, lucro, margem_por_saca: margemPorSaca, margem_pct: margemPct };
    return { result: sim, simulacao: sim };
  }

  if (name === "criar_alerta") {
    const tipo = input.tipo;
    if (!["preco", "margem", "cambio", "sinal_ia"].includes(tipo as string)) return { result: { erro: "tipo inválido" } };
    const precisaValor = tipo !== "sinal_ia";
    const valor = num(input.valor_alvo);
    if (precisaValor && (valor === null || valor <= 0)) return { result: { erro: "informe o valor do gatilho" } };
    const usaCommodity = tipo !== "cambio";
    if (usaCommodity && !isCommodity(input.commodity)) return { result: { erro: "informe a cultura do alerta" } };
    const operador = input.operador === "<=" ? "<=" : ">=";
    const canais = input.whatsapp ? ["push", "whatsapp"] : ["push"];
    const { error } = await supabase.from("alertas").insert({
      cooperado_id: cooperadoId, tipo,
      commodity: usaCommodity ? input.commodity : null,
      par_cambio: tipo === "cambio" ? (input.par_cambio ?? "USD/BRL") : null,
      operador, valor_alvo: precisaValor ? valor : null, canais,
    });
    return { result: error ? { erro: error.message } : { ok: true, tipo, operador, valor_alvo: precisaValor ? valor : null } };
  }

  return { result: { erro: `ferramenta desconhecida: ${name}` } };
}

// ---------------------------------------------------------------------------
// Fallback determinístico (sem ANTHROPIC_API_KEY)
// ---------------------------------------------------------------------------
function respostaFallback(c: Cenario): string {
  if (!c.custos.length && !c.carteira.length) {
    return `Oi, ${c.nome}! Pra eu te ajudar a vender melhor, me conta: qual cultura você produz e quantas sacas você espera colher nesta safra?`;
  }
  const partes: string[] = [`Aqui está sua posição, ${c.nome}:`];
  for (const p of c.carteira) {
    const spot = c.precoSpot[p.commodity];
    let l = `• ${p.commodity} ${p.safra}: fixado ${p.fixadoSacas} sc`;
    if (p.pctVendido !== null) l += ` (${Math.round(p.pctVendido * 100)}% da safra)`;
    if (p.restanteSacas !== null && spot) l += `. Vendendo hoje as ${p.restanteSacas} sc restantes a R$ ${spot.preco}: R$ ${(p.restanteSacas * spot.preco).toFixed(2)}`;
    partes.push(l + ".");
  }
  return partes.join("\n");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { texto?: string; cooperado_id?: string; canal?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }
  const texto = (body.texto ?? "").toString().trim();
  if (!texto) return json({ error: "texto vazio" }, 400);

  // --- Autenticação / resolução do cooperado ---
  let cooperadoId: string | null = null;
  let canal = "app";
  const workerSecret = Deno.env.get("WORKER_SECRET");
  const enviouSecret = req.headers.get("x-worker-secret");

  if (enviouSecret && workerSecret && enviouSecret === workerSecret && body.cooperado_id) {
    cooperadoId = body.cooperado_id;
    canal = body.canal === "whatsapp" || body.canal === "telegram" ? body.canal : "app";
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "não autorizado" }, 401);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "sessão inválida" }, 401);
    cooperadoId = u.user.id;
    canal = "app";
  }

  // --- Registra a mensagem do usuário ---
  await admin.from("chat_mensagens").insert({ cooperado_id: cooperadoId, canal, role: "user", conteudo: texto });

  // --- Histórico recente + cenário ---
  const [{ data: hist }, cenario] = await Promise.all([
    admin.from("chat_mensagens").select("role, conteudo").eq("cooperado_id", cooperadoId).eq("canal", canal).order("criado_em", { ascending: false }).limit(12),
    montarCenario(admin, cooperadoId),
  ]);
  const historico = (hist ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.conteudo }));

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  let reply = "";
  let simulacao: unknown = undefined;

  if (!apiKey) {
    reply = respostaFallback(cenario);
  } else {
    try {
      const anthropic = new Anthropic({ apiKey });
      const system = `${SYSTEM_BASE}\n\n=== CENÁRIO ATUAL DO PRODUTOR ===\n${cenarioParaTexto(cenario)}`;
      // O histórico já inclui a mensagem atual (acabou de ser inserida). A API
      // exige que a 1ª mensagem seja do usuário — apara assistentes do início
      // (a janela deslizante pode começar numa resposta do bot).
      const janela = [...historico];
      while (janela.length && janela[0].role !== "user") janela.shift();
      const messages: Array<{ role: "user" | "assistant"; content: unknown }> = janela.map((m) => ({ role: m.role, content: m.content }));

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const resp = await anthropic.messages.create({
          model: MODELO,
          max_tokens: 1024,
          system,
          tools: TOOLS as unknown as Anthropic.Tool[],
          messages: messages as Anthropic.MessageParam[],
        });

        if (resp.stop_reason === "tool_use") {
          messages.push({ role: "assistant", content: resp.content });
          const results: unknown[] = [];
          for (const block of resp.content) {
            if (block.type === "tool_use") {
              const out = await execTool(admin, cooperadoId, canal, cenario, block.name, block.input as Record<string, unknown>);
              if (out.simulacao) simulacao = out.simulacao;
              results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out.result) });
            }
          }
          messages.push({ role: "user", content: results });
          continue;
        }

        reply = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();
        break;
      }
      if (!reply) reply = respostaFallback(cenario);
    } catch (err) {
      console.error("[chatbot] Claude API falhou:", err);
      reply = respostaFallback(cenario);
    }
  }

  await admin.from("chat_mensagens").insert({ cooperado_id: cooperadoId, canal, role: "assistant", conteudo: reply });

  return json({ reply, simulacao });
});
