import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { COMMODITIES, COMMODITY_EMOJI, COMMODITY_LABEL } from "@/lib/commodities";
import { formatBRL } from "@/lib/format";
import { useCooperado } from "@/hooks/use-auth";
import { useCommoditiesAtivas } from "@/hooks/use-market";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

function SecaoMarca() {
  const { data: cooperado } = useCooperado();
  const queryClient = useQueryClient();
  const coop = cooperado?.cooperativa;

  const [nome, setNome] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#1A5C38");
  const [corSecundaria, setCorSecundaria] = useState("#F59E0B");

  useEffect(() => {
    if (coop) {
      setNome(coop.nome);
      setLogoUrl(coop.logo_url ?? "");
      setCorPrimaria(coop.cor_primaria);
      setCorSecundaria(coop.cor_secundaria);
    }
  }, [coop]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da cooperativa.");
      const { error } = await supabase
        .from("cooperativas")
        .update({
          nome: nome.trim(),
          logo_url: logoUrl.trim() || null,
          cor_primaria: corPrimaria,
          cor_secundaria: corSecundaria,
        })
        .eq("id", coop!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperado"] });
      toast.success("Marca atualizada. Os cooperados verão as novas cores.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!coop) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Marca da cooperativa</CardTitle>
        <CardDescription>
          O app dos seus cooperados usa essas cores e logo. Portal:{" "}
          <code className="rounded bg-muted px-1">/c/{coop.slug}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="coop-nome">Nome</Label>
          <Input id="coop-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coop-logo">URL do logo</Label>
          <Input
            id="coop-logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…/logo.png"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cor-prim">Cor primária</Label>
            <div className="flex items-center gap-2">
              <input
                id="cor-prim"
                type="color"
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
              />
              <Input value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cor-sec">Cor secundária</Label>
            <div className="flex items-center gap-2">
              <input
                id="cor-sec"
                type="color"
                value={corSecundaria}
                onChange={(e) => setCorSecundaria(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
              />
              <Input value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} />
            </div>
          </div>
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar marca"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SecaoCommodities() {
  const { data: cooperado } = useCooperado();
  const { data: config } = useCommoditiesAtivas();
  const queryClient = useQueryClient();

  const alternar = useMutation({
    mutationFn: async ({ commodity, ativo }: { commodity: (typeof COMMODITIES)[number]; ativo: boolean }) => {
      const { error } = await supabase.from("commodities_config").upsert(
        { cooperativa_id: cooperado!.cooperativa_id, commodity, ativo },
        { onConflict: "cooperativa_id,commodity" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commodities-config"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commodities exibidas</CardTitle>
        <CardDescription>O painel dos cooperados mostra apenas as culturas ativas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {COMMODITIES.map((c) => {
          const registro = config?.find((x) => x.commodity === c);
          const ativo = registro ? registro.ativo : true;
          return (
            <div key={c} className="flex items-center justify-between rounded-md border p-3">
              <span className="font-medium">
                {COMMODITY_EMOJI[c]} {COMMODITY_LABEL[c]}
              </span>
              <Switch
                checked={ativo}
                onCheckedChange={(v) => alternar.mutate({ commodity: c, ativo: v })}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SecaoReceita() {
  const { data: cooperado } = useCooperado();

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["revenue-share", cooperado?.cooperativa_id],
    enabled: !!cooperado?.cooperativa_id && cooperado.role === "admin_coop",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_share_events")
        .select("*")
        .eq("cooperativa_id", cooperado!.cooperativa_id)
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = (eventos ?? []).reduce((soma, e) => soma + Number(e.valor_share ?? 0), 0);

  const porMes = new Map<string, number>();
  for (const e of eventos ?? []) {
    const mes = e.competencia.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + Number(e.valor_share ?? 0));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receita compartilhada (20%)</CardTitle>
        <CardDescription>
          Sua cooperativa recebe 20% de cada assinatura Pro dos seus cooperados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (eventos?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum repasse ainda — eles aparecem aqui quando cooperados assinarem o Pro.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-2xl font-bold text-primary">{formatBRL(total)}</p>
            <div className="space-y-1">
              {[...porMes.entries()].map(([mes, valor]) => (
                <div key={mes} className="flex justify-between border-b py-1 text-sm last:border-0">
                  <span className="text-muted-foreground">
                    {new Date(`${mes}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </span>
                  <span className="font-medium tabular-nums">{formatBRL(valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminCoop() {
  const { data: cooperado, isLoading } = useCooperado();
  const coop = cooperado?.cooperativa;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (cooperado && cooperado.role !== "admin_coop") {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel da cooperativa</h1>
          <p className="text-sm text-muted-foreground">{coop?.nome}</p>
        </div>
        {coop && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">plano {coop.plano}</Badge>
            <Badge variant={coop.status === "active" ? "default" : "destructive"}>
              {coop.status === "active" ? "ativa" : coop.status}
            </Badge>
            <Badge variant="outline">{coop.seats} seats</Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SecaoMarca />
          <SecaoReceita />
        </div>
        <SecaoCommodities />
      </div>
    </div>
  );
}
