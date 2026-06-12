import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { COMMODITY_LABEL, type Commodity } from "@/lib/commodities";
import { formatBRL } from "@/lib/format";
import { useHistoricoPrecos } from "@/hooks/use-market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Grafico({ commodity }: { commodity: Commodity }) {
  const { data: historico, isLoading } = useHistoricoPrecos(commodity);

  if (isLoading) return <Skeleton className="h-60 w-full" />;

  if (!historico || historico.length < 2) {
    return (
      <div className="flex h-60 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground">
        Histórico insuficiente — os preços aparecem aqui conforme o mercado é acompanhado.
      </div>
    );
  }

  const pontos = historico.map((h) => ({
    dia: new Date(h.capturado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    preco: Number(h.preco),
  }));
  const unidade = historico[historico.length - 1].unidade;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="precoGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => [`${formatBRL(Number(value))} (${unidade})`, "Preço"]}
          labelClassName="text-xs"
        />
        <Area
          type="monotone"
          dataKey="preco"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#precoGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PrecoChart({ commodities }: { commodities: Commodity[] }) {
  const [ativa, setAtiva] = useState<Commodity>(commodities[0]);
  const selecionada = commodities.includes(ativa) ? ativa : commodities[0];

  if (commodities.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Histórico de preços</CardTitle>
        <Tabs value={selecionada} onValueChange={(v) => setAtiva(v as Commodity)}>
          <TabsList className="h-8">
            {commodities.map((c) => (
              <TabsTrigger key={c} value={c} className="px-2.5 py-1 text-xs">
                {COMMODITY_LABEL[c]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <Grafico commodity={selecionada} />
      </CardContent>
    </Card>
  );
}
