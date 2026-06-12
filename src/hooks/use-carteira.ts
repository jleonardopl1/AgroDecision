import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Commodity } from "@/lib/commodities";
import {
  montarCarteira,
  type Fixacao as FixacaoCalc,
  type Producao as ProducaoCalc,
} from "@/lib/simulador";
import { useAuth } from "@/hooks/use-auth";

export type Producao = Tables<"producoes">;
export type Fixacao = Tables<"fixacoes">;

export function useProducoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["producoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producoes")
        .select("*")
        .eq("cooperado_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFixacoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fixacoes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixacoes")
        .select("*")
        .eq("cooperado_id", user!.id)
        .order("fixado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Carteira consolidada (produção − fixações), pronta para a UI. */
export function useCarteira() {
  const producoes = useProducoes();
  const fixacoes = useFixacoes();
  const prod: ProducaoCalc[] = (producoes.data ?? []).map((p) => ({
    commodity: p.commodity,
    safra: p.safra,
    producao_sacas: p.producao_sacas,
    preco_alvo: p.preco_alvo,
    margem_alvo_pct: p.margem_alvo_pct,
  }));
  const fix: FixacaoCalc[] = (fixacoes.data ?? []).map((f) => ({
    commodity: f.commodity,
    safra: f.safra,
    sacas: Number(f.sacas),
    preco: Number(f.preco),
  }));
  return {
    posicoes: montarCarteira(prod, fix),
    isLoading: producoes.isLoading || fixacoes.isLoading,
  };
}

export function useSalvarProducao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      commodity: Commodity;
      safra: string;
      producao_sacas?: number | null;
      area_ha?: number | null;
      preco_alvo?: number | null;
      margem_alvo_pct?: number | null;
    }) => {
      const { error } = await supabase.from("producoes").upsert(
        { cooperado_id: user!.id, ...p },
        { onConflict: "cooperado_id,commodity,safra" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["producoes"] }),
  });
}

export function useAdicionarFixacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (f: {
      commodity: Commodity;
      safra: string;
      sacas: number;
      preco: number;
      observacao?: string | null;
    }) => {
      const { error } = await supabase
        .from("fixacoes")
        .insert({ cooperado_id: user!.id, canal: "app", ...f });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fixacoes"] }),
  });
}

export function useRemoverFixacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fixacoes"] }),
  });
}
