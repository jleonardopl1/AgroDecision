/**
 * Núcleo de cálculo da carteira comercial e da simulação de venda.
 * Funções puras (sem I/O) — reutilizadas pela tela do app e espelhadas na
 * edge function `chatbot`. Tudo em sacas (ou arrobas) e R$/saca.
 */
import type { Commodity } from "@/lib/commodities";

export interface Producao {
  commodity: Commodity;
  safra: string;
  producao_sacas: number | null;
  preco_alvo: number | null;
  margem_alvo_pct: number | null;
}

export interface Fixacao {
  commodity: Commodity;
  safra: string;
  sacas: number;
  preco: number;
}

export interface PosicaoCarteira {
  commodity: Commodity;
  safra: string;
  producaoSacas: number | null;
  /** Soma das sacas já fixadas. */
  fixadoSacas: number;
  /** Sacas ainda em aberto (produção − fixado), quando há produção informada. */
  restanteSacas: number | null;
  /** Fração já vendida (0..1), quando há produção informada. */
  pctVendido: number | null;
  /** Receita já travada nas fixações (Σ sacas × preço). */
  receitaTravada: number;
  /** Preço médio das fixações (receita travada ÷ sacas fixadas). */
  precoMedioFixado: number | null;
}

/** Consolida produção + fixações em uma posição por cultura/safra. */
export function montarCarteira(
  producoes: Producao[],
  fixacoes: Fixacao[],
): PosicaoCarteira[] {
  const chave = (commodity: string, safra: string) => `${commodity}::${safra}`;
  const mapa = new Map<string, PosicaoCarteira>();

  const obter = (commodity: Commodity, safra: string): PosicaoCarteira => {
    const k = chave(commodity, safra);
    let pos = mapa.get(k);
    if (!pos) {
      pos = {
        commodity,
        safra,
        producaoSacas: null,
        fixadoSacas: 0,
        restanteSacas: null,
        pctVendido: null,
        receitaTravada: 0,
        precoMedioFixado: null,
      };
      mapa.set(k, pos);
    }
    return pos;
  };

  for (const p of producoes) {
    const pos = obter(p.commodity, p.safra);
    pos.producaoSacas = p.producao_sacas;
  }
  for (const f of fixacoes) {
    const pos = obter(f.commodity, f.safra);
    pos.fixadoSacas += f.sacas;
    pos.receitaTravada += f.sacas * f.preco;
  }

  for (const pos of mapa.values()) {
    pos.precoMedioFixado = pos.fixadoSacas > 0 ? pos.receitaTravada / pos.fixadoSacas : null;
    if (pos.producaoSacas !== null && pos.producaoSacas > 0) {
      pos.restanteSacas = Math.max(0, pos.producaoSacas - pos.fixadoSacas);
      pos.pctVendido = Math.min(1, pos.fixadoSacas / pos.producaoSacas);
    }
  }

  return [...mapa.values()].sort(
    (a, b) => a.commodity.localeCompare(b.commodity) || b.safra.localeCompare(a.safra),
  );
}

export interface ResultadoSimulacao {
  /** Sacas consideradas na simulação. */
  sacas: number;
  precoUsado: number;
  /** Receita bruta = sacas × preço. */
  receita: number;
  /** Lucro = (preço − custo) × sacas, quando há custo informado. */
  lucro: number | null;
  /** Margem por saca (preço − custo), quando há custo. */
  margemPorSaca: number | null;
  /** Margem % sobre o custo, quando há custo. */
  margemPct: number | null;
}

/**
 * "Se eu vender hoje, quanto recebo?" — receita e lucro de vender `sacas` ao
 * `preco` informado. Quando `sacas` não é dado, usa o restante em aberto.
 */
export function simularVenda(params: {
  preco: number;
  sacas?: number | null;
  restanteSacas?: number | null;
  custoPorSaca?: number | null;
}): ResultadoSimulacao {
  const sacas = params.sacas ?? params.restanteSacas ?? 0;
  const receita = sacas * params.preco;
  const custo = params.custoPorSaca ?? null;
  const margemPorSaca = custo !== null ? params.preco - custo : null;
  const lucro = margemPorSaca !== null ? margemPorSaca * sacas : null;
  const margemPct = custo !== null && custo > 0 ? ((params.preco - custo) / custo) * 100 : null;
  return { sacas, precoUsado: params.preco, receita, lucro, margemPorSaca, margemPct };
}
