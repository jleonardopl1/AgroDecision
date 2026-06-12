/**
 * alerta-worker — avalia gatilhos configurados pelos cooperados a cada 5 min (F04).
 *
 * Tipos de alerta: preco, margem, cambio, sinal_ia.
 * Cooldown de 6h por alerta para evitar spam.
 * Entrega push (OneSignal) e WhatsApp (Twilio) entram quando as chaves forem
 * configuradas; até lá o disparo é registrado em ultimo_disparo + logs.
 *
 * Roda com service_role. Proteção: verify_jwt + x-worker-secret opcional.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const COOLDOWN_MS = 6 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function compara(valor: number, operador: string, alvo: number): boolean {
  return operador === ">=" ? valor >= alvo : valor <= alvo;
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

  const { data: alertas, error: errAlertas } = await supabase
    .from("alertas")
    .select("*")
    .eq("ativo", true);
  if (errAlertas) return json({ error: errAlertas.message }, 500);
  if (!alertas?.length) return json({ ok: true, avaliados: 0, disparados: 0 });

  // Snapshot de mercado
  const { data: cotacoes } = await supabase
    .from("cotacoes_cache")
    .select("commodity, preco")
    .eq("tipo", "spot")
    .is("regiao", null)
    .order("capturado_em", { ascending: false })
    .limit(60);
  const { data: cambios } = await supabase
    .from("cambio_cache")
    .select("par, cotacao")
    .order("capturado_em", { ascending: false })
    .limit(10);
  const { data: sinais } = await supabase
    .from("sinais_ia")
    .select("commodity, sinal, gerado_em")
    .order("gerado_em", { ascending: false })
    .limit(60);

  const precoDe = (cm: string) => {
    const c = cotacoes?.find((x) => x.commodity === cm);
    return c ? Number(c.preco) : null;
  };

  // Custos só dos cooperados com alerta de margem
  const idsMargem = [
    ...new Set(alertas.filter((a) => a.tipo === "margem").map((a) => a.cooperado_id)),
  ];
  const { data: custos } = idsMargem.length
    ? await supabase
      .from("custos_producao")
      .select("cooperado_id, commodity, custo_por_saca, safra")
      .in("cooperado_id", idsMargem)
    : {
      data: [] as Array<
        { cooperado_id: string; commodity: string; custo_por_saca: number; safra: string }
      >,
    };

  const agora = Date.now();
  let disparados = 0;

  for (const alerta of alertas) {
    if (
      alerta.ultimo_disparo &&
      agora - new Date(alerta.ultimo_disparo).getTime() < COOLDOWN_MS
    ) {
      continue;
    }

    let dispara = false;
    let contexto = "";

    if (alerta.tipo === "preco" && alerta.commodity && alerta.valor_alvo != null) {
      const preco = precoDe(alerta.commodity);
      if (preco != null && compara(preco, alerta.operador, Number(alerta.valor_alvo))) {
        dispara = true;
        contexto = `${alerta.commodity} ${alerta.operador} ${alerta.valor_alvo} (atual: ${preco})`;
      }
    } else if (alerta.tipo === "cambio" && alerta.par_cambio && alerta.valor_alvo != null) {
      const c = cambios?.find((x) => x.par === alerta.par_cambio);
      if (c && compara(Number(c.cotacao), alerta.operador, Number(alerta.valor_alvo))) {
        dispara = true;
        contexto = `${alerta.par_cambio} ${alerta.operador} ${alerta.valor_alvo} (atual: ${c.cotacao})`;
      }
    } else if (alerta.tipo === "margem" && alerta.commodity && alerta.valor_alvo != null) {
      const preco = precoDe(alerta.commodity);
      const custo = custos
        ?.filter((c) => c.cooperado_id === alerta.cooperado_id && c.commodity === alerta.commodity)
        .sort((a, b) => b.safra.localeCompare(a.safra))[0];
      if (preco != null && custo) {
        const margem = preco - Number(custo.custo_por_saca);
        if (compara(margem, alerta.operador, Number(alerta.valor_alvo))) {
          dispara = true;
          contexto =
            `margem ${alerta.commodity} ${alerta.operador} ${alerta.valor_alvo} (atual: ${margem.toFixed(2)})`;
        }
      }
    } else if (alerta.tipo === "sinal_ia" && alerta.commodity) {
      const doCommodity = sinais?.filter((s) => s.commodity === alerta.commodity) ?? [];
      const ultimo = doCommodity[0];
      const anterior = doCommodity[1];
      const novoDesdeUltimoDisparo = ultimo &&
        (!alerta.ultimo_disparo ||
          new Date(ultimo.gerado_em) > new Date(alerta.ultimo_disparo));
      if (ultimo && novoDesdeUltimoDisparo && (!anterior || anterior.sinal !== ultimo.sinal)) {
        dispara = true;
        contexto = `sinal de ${alerta.commodity} mudou para ${ultimo.sinal}`;
      }
    }

    if (dispara) {
      // TODO: OneSignal (push) + Twilio (WhatsApp) quando as chaves estiverem nas envs.
      console.log(
        `[alerta-worker] disparo ${alerta.id} (${alerta.canais?.join(",")}) → ${contexto}`,
      );
      await supabase
        .from("alertas")
        .update({ ultimo_disparo: new Date().toISOString() })
        .eq("id", alerta.id);
      disparados++;
    }
  }

  return json({ ok: true, avaliados: alertas.length, disparados });
});
