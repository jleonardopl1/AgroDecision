/**
 * telegram-webhook — porta de entrada do chatbot no Telegram.
 *
 * Fluxo:
 *  1. Valida o secret token do Telegram (header X-Telegram-Bot-Api-Secret-Token).
 *  2. Resolve o vínculo cooperado↔chat_id. Se ainda não existe, trata a 1ª
 *     mensagem como o CÓDIGO de pareamento gerado no app (chat_vinculos.codigo).
 *  3. Encaminha o texto à function `chatbot` (service role) e devolve a resposta.
 *
 * Deploy: verify_jwt = false (o Telegram não manda JWT; a proteção é o secret token).
 * Configurar webhook:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FN_URL>&secret_token=<SECRET>
 * Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, WORKER_SECRET.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") ?? "";

async function sendMessage(chatId: string | number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  // Proteção: o Telegram repete o secret token configurado no setWebhook.
  if (WEBHOOK_SECRET && req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await req.json();
  } catch {
    return new Response("ok"); // ignora payloads que não conseguimos ler
  }

  const chatId = update.message?.chat?.id;
  const texto = (update.message?.text ?? "").trim();
  if (chatId === undefined || !texto) return new Response("ok");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const chatKey = String(chatId);

  // 1) Já vinculado e verificado?
  const { data: vinculo } = await admin
    .from("chat_vinculos")
    .select("cooperado_id, verificado")
    .eq("canal", "telegram")
    .eq("chat_id", chatKey)
    .maybeSingle();

  if (!vinculo) {
    // 2) Tenta usar a mensagem como código de pareamento.
    const codigo = texto.toUpperCase().replace(/\s+/g, "");
    const { data: pendente } = await admin
      .from("chat_vinculos")
      .select("id, cooperado_id")
      .eq("canal", "telegram")
      .eq("codigo", codigo)
      .eq("verificado", false)
      .maybeSingle();

    if (!pendente) {
      await sendMessage(
        chatId,
        "Olá! Para conectar sua conta AgroDecision, abra o app, vá em Conversa → Conectar Telegram e me envie aqui o código que aparecer lá. 🌱",
      );
      return new Response("ok");
    }

    const { error } = await admin
      .from("chat_vinculos")
      .update({ chat_id: chatKey, verificado: true })
      .eq("id", pendente.id);
    if (error) {
      await sendMessage(chatId, "Não consegui confirmar o código. Gere um novo no app e tente de novo.");
      return new Response("ok");
    }
    await sendMessage(
      chatId,
      "Conta conectada! ✅ Agora é só conversar comigo: me conte sua cultura, quanto espera colher e seu custo por saca, que eu te ajudo a vender no melhor momento.",
    );
    return new Response("ok");
  }

  // 3) Encaminha ao chatbot.
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-worker-secret": WORKER_SECRET },
    body: JSON.stringify({ texto, cooperado_id: vinculo.cooperado_id, canal: "telegram" }),
  });
  const data = await resp.json().catch(() => ({ reply: "" }));
  await sendMessage(chatId, data.reply || "Tive um problema para responder agora. Pode repetir?");

  return new Response("ok");
});
