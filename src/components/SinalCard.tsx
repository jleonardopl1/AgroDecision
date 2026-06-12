import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { COMMODITY_EMOJI, COMMODITY_LABEL, type Commodity } from "@/lib/commodities";
import { formatBRL, formatPct, tempoRelativo } from "@/lib/format";
import type { Cotacao, CustoProducao, SinalIA } from "@/hooks/use-market";
import { Card, CardContent } from "@/components/ui/card";
import { SinalBadge } from "@/components/SinalBadge";

interface SinalCardProps {
  commodity: Commodity;
  cotacao?: Cotacao;
  sinal?: SinalIA;
  custo?: CustoProducao;
  /** Card grande no topo do dashboard — a decisão dos 30 segundos. */
  destaque?: boolean;
}

function Variacao({ pct, className }: { pct: number | null; className?: string }) {
  if (pct === null) return null;
  const positiva = pct >= 0;
  const Icon = positiva ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium",
        positiva ? "text-sinal-vender" : "text-sinal-atencao",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {formatPct(pct)}
    </span>
  );
}

function Margem({ cotacao, custo }: { cotacao: Cotacao; custo: CustoProducao }) {
  const margem = Number(cotacao.preco) - Number(custo.custo_por_saca);
  const pct = (margem / Number(custo.custo_por_saca)) * 100;
  const positiva = margem >= 0;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">Sua margem ({custo.safra}): </span>
      <span className={cn("font-semibold", positiva ? "text-sinal-vender" : "text-sinal-atencao")}>
        {formatBRL(margem)}/{cotacao.unidade.replace("R$/", "")} ({formatPct(pct)})
      </span>
    </p>
  );
}

export function SinalCard({ commodity, cotacao, sinal, custo, destaque = false }: SinalCardProps) {
  return (
    <Card className={cn(destaque && "border-2 border-primary/30 shadow-md")}>
      <CardContent className={cn("space-y-3", destaque ? "p-6" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={destaque ? "text-3xl" : "text-xl"} aria-hidden>
              {COMMODITY_EMOJI[commodity]}
            </span>
            <div>
              <p className={cn("font-semibold leading-tight", destaque && "text-lg")}>
                {COMMODITY_LABEL[commodity]}
              </p>
              {cotacao && (
                <p className="text-xs text-muted-foreground">
                  {cotacao.fonte.toUpperCase()} · {tempoRelativo(cotacao.capturado_em)}
                </p>
              )}
            </div>
          </div>
          {sinal ? (
            <SinalBadge sinal={sinal.sinal} size={destaque ? "lg" : "sm"} />
          ) : (
            <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
              sem sinal
            </span>
          )}
        </div>

        {cotacao && (
          <div className="flex items-baseline gap-3">
            <span className={cn("font-bold tabular-nums", destaque ? "text-3xl" : "text-xl")}>
              {formatBRL(Number(cotacao.preco))}
            </span>
            <span className="text-sm text-muted-foreground">
              {cotacao.unidade.replace("R$/", "/")}
            </span>
            <Variacao pct={cotacao.variacao_pct === null ? null : Number(cotacao.variacao_pct)} />
          </div>
        )}

        {sinal && (destaque || sinal.sinal !== "AGUARDAR") && (
          <div className="space-y-1 rounded-md bg-secondary/60 p-3">
            <p className="text-sm font-semibold text-secondary-foreground">{sinal.recomendacao}</p>
            <p className="text-sm leading-snug text-foreground/80">{sinal.justificativa}</p>
            {sinal.confianca !== null && (
              <p className="text-xs text-muted-foreground">
                Confiança do sinal: {Math.round(Number(sinal.confianca) * 100)}%
              </p>
            )}
          </div>
        )}

        {cotacao && custo && <Margem cotacao={cotacao} custo={custo} />}
      </CardContent>
    </Card>
  );
}
