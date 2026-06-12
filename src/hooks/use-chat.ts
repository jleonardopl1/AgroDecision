import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";

export type ChatMensagem = Tables<"chat_mensagens">;
export type ChatVinculo = Tables<"chat_vinculos">;
export type Canal = "whatsapp" | "telegram";

/** Conversa do app (canal = 'app'). */
export function useConversa() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_mensagens")
        .select("*")
        .eq("cooperado_id", user!.id)
        .eq("canal", "app")
        .order("criado_em", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface RespostaChatbot {
  reply: string;
  simulacao?: {
    commodity: string;
    safra: string;
    sacas: number;
    preco_usado: number;
    receita: number;
    lucro: number | null;
    margem_pct: number | null;
  };
}

/** Envia a mensagem ao chatbot (edge function) e devolve a resposta. */
export function useEnviarMensagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (texto: string): Promise<RespostaChatbot> => {
      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: { texto },
      });
      if (error) throw error;
      return data as RespostaChatbot;
    },
    onSuccess: () => {
      // O bot pode ter registrado fixação/produção/alerta — revalida tudo.
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      queryClient.invalidateQueries({ queryKey: ["fixacoes"] });
      queryClient.invalidateQueries({ queryKey: ["producoes"] });
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}

export function useVinculos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-vinculos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_vinculos")
        .select("*")
        .eq("cooperado_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function gerarCodigo(): string {
  // Sem caracteres ambíguos (0/O, 1/I).
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return s;
}

/** (Re)gera o código de pareamento de um canal: remove o pendente e cria novo. */
export function useConectarCanal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (canal: Canal): Promise<string> => {
      await supabase.from("chat_vinculos").delete().eq("cooperado_id", user!.id).eq("canal", canal);
      const codigo = gerarCodigo();
      const { error } = await supabase
        .from("chat_vinculos")
        .insert({ cooperado_id: user!.id, canal, codigo });
      if (error) throw error;
      return codigo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-vinculos"] }),
  });
}

export function useDesconectarCanal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (canal: Canal) => {
      const { error } = await supabase
        .from("chat_vinculos")
        .delete()
        .eq("cooperado_id", user!.id)
        .eq("canal", canal);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-vinculos"] }),
  });
}
