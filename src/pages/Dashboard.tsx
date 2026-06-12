import { Link } from "react-router-dom";
import { ArrowRight, Calculator, DollarSign } from "lucide-react";

import { COMMODITIES, isCommodity, type Commodity } from "@/lib/commodities";
import { formatCambio, formatPct } from "@/lib/format";
import { useCooperado } from "@/hooks/use-auth";
import {
  useCambio,
  useCommoditiesAtivas,
  useCotacoes,
  useCustos,
  useSinais,
} from "@/hooks/use-market";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrecoChart } from "@/components/PrecoChart";
import { SinalCard } from "@/components/SinalCard";

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { data: cooperado, isLoading: loadingCooperado } = useCooperado();
  const { data: config } = useCommoditiesAtivas();
  const { data: cotacoes, isLoading: loadingCotacoes } = useCotacoes();
  const { data: sinais } = useSinais();
  const { data: cambio } = useCambio();
  const { data: custos } = useCustos();

  const loading = loadingCooperado || loadingCotacoes;

  // Commodities exibidas: todas, menos as desativadas explicitamente pela
  // cooperativa (commodity sem linha em config = exibida — mesmo critério do
  // painel admin). As culturas do produtor vêm primeiro: a decisão dele no topo.
  const desativadas = new Set(
    (config ?? []).filter((c) => !c.ativo).map((c) => c.commodity),
  );
  const base: Commodity[] = COMMODITIES.filter((c) => !desativadas.has(c));
  const culturas = (cooperado?.culturas ?? []).filter(isCommodity);
  const ordenadas = [
    ...culturas.filter((c) => base.includes(c)),
    ...base.filter((c) => !culturas.includes(c)),
  ];

  const [principal, ...demais] = ordenadas;
  const custoDe = (c: Commodity) => custos?.find((x) => x.commodity === c);
  const temCusto = (custos?.length ?? 0) > 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {saudacao()}, {cooperado?.nome?.split(" ")[0] ?? "produtor"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          O que o mercado diz hoje sobre a sua produção.
        </p>
      </div>

      {principal && (
        <SinalCard
          commodity={principal}
          cotacao={cotacoes?.get(principal)}
          sinal={sinais?.get(principal)}
          custo={custoDe(principal)}
          destaque
        />
      )}

      {!temCusto && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">Cadastre seu custo de produção</p>
                <p className="text-sm text-muted-foreground">
                  Em 1 minuto você passa a ver a sua margem real em cada cotação.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/app/margem">
                Calcular margem <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {demais.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demais.map((c) => (
            <SinalCard
              key={c}
              commodity={c}
              cotacao={cotacoes?.get(c)}
              sinal={sinais?.get(c)}
              custo={custoDe(c)}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {["USD/BRL", "EUR/BRL"].map((par) => {
          const c = cambio?.get(par);
          return (
            <Card key={par}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{par}</span>
                </div>
                {c ? (
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{formatCambio(Number(c.cotacao))}</p>
                    {c.variacao_pct !== null && (
                      <p
                        className={
                          Number(c.variacao_pct) >= 0
                            ? "text-xs text-sinal-vender"
                            : "text-xs text-sinal-atencao"
                        }
                      >
                        {formatPct(Number(c.variacao_pct))}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PrecoChart commodities={ordenadas} />
    </div>
  );
}
