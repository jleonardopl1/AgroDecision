import { useEffect, type ReactNode } from "react";

import { hexToHslVar, isDarkColor } from "@/lib/design-tokens";
import { useCooperado } from "@/hooks/use-auth";

export interface Branding {
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
}

/**
 * Sobrescreve as CSS vars do design system com as cores da cooperativa
 * (co-branding). Restaura os tokens padrão ao desmontar.
 */
export function useApplyBranding(branding?: Branding | null) {
  const corPrimaria = branding?.cor_primaria ?? null;
  const corSecundaria = branding?.cor_secundaria ?? null;

  useEffect(() => {
    const root = document.documentElement;
    const aplicadas: string[] = [];

    const set = (name: string, value: string) => {
      root.style.setProperty(name, value);
      aplicadas.push(name);
    };

    const primaria = corPrimaria ? hexToHslVar(corPrimaria) : null;
    if (primaria && corPrimaria) {
      set("--primary", primaria);
      set("--ring", primaria);
      set("--campo", primaria);
      set("--sinal-vender", primaria);
      set("--primary-foreground", isDarkColor(corPrimaria) ? "0 0% 100%" : "215 28% 17%");
    }

    const secundaria = corSecundaria ? hexToHslVar(corSecundaria) : null;
    if (secundaria && corSecundaria) {
      set("--accent", secundaria);
      set("--colheita", secundaria);
      set("--sinal-aguardar", secundaria);
      set("--accent-foreground", isDarkColor(corSecundaria) ? "0 0% 100%" : "24 30% 15%");
    }

    return () => {
      aplicadas.forEach((name) => root.style.removeProperty(name));
    };
  }, [corPrimaria, corSecundaria]);
}

/** Aplica o branding da cooperativa do usuário logado em toda a área /app. */
export function CoopThemeProvider({ children }: { children: ReactNode }) {
  const { data: cooperado } = useCooperado();
  useApplyBranding(cooperado?.cooperativa);
  return <>{children}</>;
}
