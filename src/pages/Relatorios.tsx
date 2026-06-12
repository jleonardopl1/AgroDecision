import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatData } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Relatorio = Tables<"relatorios">;

export default function Relatorios() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ["relatorios", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorios")
        .select("*")
        .eq("cooperado_id", user!.id)
        .order("semana", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const abrir = useMutation({
    mutationFn: async (r: Relatorio) => {
      if (!r.pdf_url) throw new Error("PDF ainda não disponível para esta semana.");
      window.open(r.pdf_url, "_blank", "noopener");
      if (!r.aberto) {
        const { error } = await supabase.from("relatorios").update({ aberto: true }).eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["relatorios"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios semanais</h1>
        <p className="text-sm text-muted-foreground">
          Resumo da semana em PDF: preços, sinais e o que fazer na próxima.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : relatorios && relatorios.length > 0 ? (
        <div className="space-y-3">
          {relatorios.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">Semana de {formatData(r.semana)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.enviado_em ? `enviado em ${formatData(r.enviado_em)}` : "gerado"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!r.aberto && <Badge>novo</Badge>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrir.mutate(r)}
                    disabled={!r.pdf_url}
                  >
                    <ExternalLink /> {r.pdf_url ? "Abrir PDF" : "Em preparação"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Seu primeiro relatório chega em breve</CardTitle>
            <CardDescription>
              Toda semana geramos um PDF com o resumo do mercado das suas culturas — bom para
              guardar, imprimir ou mandar no grupo da família.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
