import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Leaf } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useApplyBranding } from "@/components/CoopThemeProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Portal co-branded pré-login: /c/<slug> — a porta de entrada da cooperativa. */
export default function CoopPortal() {
  const { slug = "" } = useParams();

  const { data: branding, isLoading } = useQuery({
    queryKey: ["branding", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_coop_branding", { p_slug: slug });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  useApplyBranding(branding);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Skeleton className="h-72 w-full max-w-md" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-2xl font-bold">Cooperativa não encontrada</p>
        <p className="text-muted-foreground">
          Confira o link enviado pela sua cooperativa ou acesse o AgroDecision direto.
        </p>
        <Button asChild>
          <Link to="/">Ir para o início</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-2 border-primary/20">
        <CardContent className="space-y-6 p-8 text-center">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.nome}
              className="mx-auto h-16 w-16 rounded-xl object-contain"
            />
          ) : (
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-8 w-8" />
            </span>
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{branding.nome}</h1>
            <p className="text-sm text-muted-foreground">
              em parceria com o <span className="font-semibold">AgroDecision</span>
            </p>
          </div>
          <p className="text-muted-foreground">
            Cotações, sinal de venda com IA e a sua margem — um benefício da sua cooperativa para
            você decidir melhor a hora de vender.
          </p>
          <div className="space-y-2">
            <Button size="lg" className="w-full" asChild>
              <Link to={`/cadastro?coop=${branding.slug}`}>Criar minha conta</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full" asChild>
              <Link to="/entrar">Já tenho conta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
