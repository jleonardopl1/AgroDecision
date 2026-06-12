import type { Enums } from "@/integrations/supabase/types";

export type Commodity = Enums<"commodity">;

export const COMMODITIES: Commodity[] = ["soja", "milho", "cafe", "algodao", "boi"];

export const COMMODITY_LABEL: Record<Commodity, string> = {
  soja: "Soja",
  milho: "Milho",
  cafe: "Café",
  algodao: "Algodão",
  boi: "Boi gordo",
};

export const COMMODITY_EMOJI: Record<Commodity, string> = {
  soja: "🌱",
  milho: "🌽",
  cafe: "☕",
  algodao: "🧺",
  boi: "🐂",
};

/** Unidade padrão de comercialização (fallback quando a cotação não informa). */
export const COMMODITY_UNIDADE: Record<Commodity, string> = {
  soja: "R$/saca",
  milho: "R$/saca",
  cafe: "R$/saca",
  algodao: "R$/@",
  boi: "R$/@",
};

export type Sinal = "VENDER" | "AGUARDAR" | "ATENCAO";

export const SINAL_LABEL: Record<Sinal, string> = {
  VENDER: "VENDER",
  AGUARDAR: "AGUARDAR",
  ATENCAO: "ATENÇÃO",
};

export function isCommodity(value: string): value is Commodity {
  return (COMMODITIES as string[]).includes(value);
}
