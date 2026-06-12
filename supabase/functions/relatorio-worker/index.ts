/**
 * relatorio-worker — registra o relatório semanal por cooperado (F08).
 * Agendado para segunda-feira 06h BRT.
 *
 * Nesta fase grava a linha em `relatorios` (semana de referência + enviado_em).
 * Geração do PDF (Storage) e envio por email (Resend) entram quando as chaves
 * forem configuradas — TODO marcado abaixo.
 *
 * Roda com service_role. Proteção: verify_jwt + x-worker-secret opcional.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Segunda-feira da semana corrente (UTC, suficiente p/ chave semanal). */
function segundaDaSemana(d = new Date()): string {
  const dia = d.getUTCDay(); // 0=dom
  const diff = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return seg.toISOString().slice(0, 10);
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

  const { data: cooperados, error } = await supabase.from("cooperados").select("id");
  if (error) return json({ error: error.message }, 500);
  if (!cooperados?.length) return json({ ok: true, gerados: 0 });

  const semana = segundaDaSemana();
  const linhas = cooperados.map((c) => ({
    cooperado_id: c.id,
    semana,
    // TODO: gerar PDF (resumo da semana + sinal IA + margem) → Storage → pdf_url
    // TODO: enviar email via Resend
    enviado_em: new Date().toISOString(),
  }));

  const { error: upErr } = await supabase
    .from("relatorios")
    .upsert(linhas, { onConflict: "cooperado_id,semana", ignoreDuplicates: true });
  if (upErr) return json({ error: upErr.message }, 500);

  return json({ ok: true, semana, gerados: linhas.length });
});
