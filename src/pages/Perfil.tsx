import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  COMMODITIES,
  COMMODITY_EMOJI,
  COMMODITY_LABEL,
  type Commodity,
} from "@/lib/commodities";
import { useAuth, useCooperado } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Perfil() {
  const { user } = useAuth();
  const { data: cooperado, isLoading } = useCooperado();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [culturas, setCulturas] = useState<Commodity[]>([]);

  useEffect(() => {
    if (cooperado) {
      setNome(cooperado.nome);
      setAreaHa(cooperado.area_ha !== null ? String(cooperado.area_ha) : "");
      setCulturas(cooperado.culturas.filter((c): c is Commodity => COMMODITIES.includes(c as Commodity)));
    }
  }, [cooperado]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe seu nome.");
      const area = areaHa.trim() ? Number(areaHa.replace(",", ".")) : null;
      const { error } = await supabase
        .from("cooperados")
        .update({ nome: nome.trim(), area_ha: area, culturas })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperado"] });
      toast.success("Perfil atualizado.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleCultura = (c: Commodity) => {
    setCulturas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  if (isLoading || !cooperado) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">{cooperado.email}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Plano</CardTitle>
            <CardDescription>
              {cooperado.plano === "pro"
                ? "Você tem acesso completo via plano Pro."
                : "Plano gratuito oferecido pela sua cooperativa."}
            </CardDescription>
          </div>
          <Badge variant={cooperado.plano === "pro" ? "default" : "secondary"} className="text-sm">
            {cooperado.plano === "pro" ? "Pro" : "Free"}
          </Badge>
        </CardHeader>
        {cooperado.plano !== "pro" && (
          <CardContent className="text-sm text-muted-foreground">
            O upgrade para o Pro (alertas ilimitados + WhatsApp) é feito junto à sua cooperativa
            {cooperado.cooperativa ? ` (${cooperado.cooperativa.nome})` : ""}.
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da produção</CardTitle>
          <CardDescription>Usamos as culturas para montar o seu painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Área cultivada (ha)</Label>
            <Input
              id="area"
              inputMode="decimal"
              value={areaHa}
              onChange={(e) => setAreaHa(e.target.value)}
              placeholder="Ex.: 120"
            />
          </div>
          <div className="space-y-2">
            <Label>Minhas culturas</Label>
            <div className="flex flex-wrap gap-2">
              {COMMODITIES.map((c) => {
                const ativa = culturas.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCultura(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      ativa
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {COMMODITY_EMOJI[c]} {COMMODITY_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>
          <Separator />
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="w-full">
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
