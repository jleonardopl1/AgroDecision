import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  COMMODITIES,
  COMMODITY_EMOJI,
  COMMODITY_LABEL,
  type Commodity,
} from "@/lib/commodities";
import { formatBRL, formatPct } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { useCotacoes, useCustos, type CustoProducao } from "@/hooks/use-market";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const SAFRA_ATUAL = "2025/26";

function FormCusto({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commodity, setCommodity] = useState<Commodity>("soja");
  const [safra, setSafra] = useState(SAFRA_ATUAL);
  const [custo, setCusto] = useState("");

  const salvar = useMutation({
    mutationFn: async () => {
      const valor = Number(custo.replace(",", "."));
      if (!valor || valor <= 0) throw new Error("Informe um custo por saca válido.");
      const { error } = await supabase.from("custos_producao").upsert(
        {
          cooperado_id: user!.id,
          commodity,
          safra: safra.trim() || SAFRA_ATUAL,
          custo_por_saca: valor,
        },
        { onConflict: "cooperado_id,commodity,safra" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos"] });
      toast.success("Custo salvo. Sua margem já aparece no painel.");
      setCusto("");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cultura</Label>
        <Select value={commodity} onValueChange={(v) => setCommodity(v as Commodity)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMODITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {COMMODITY_EMOJI[c]} {COMMODITY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="safra">Safra</Label>
        <Input id="safra" value={safra} onChange={(e) => setSafra(e.target.value)} placeholder={SAFRA_ATUAL} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="custo">Custo por saca/arroba (R$)</Label>
        <Input
          id="custo"
          inputMode="decimal"
          value={custo}
          onChange={(e) => setCusto(e.target.value)}
          placeholder="Ex.: 89,50"
        />
        <p className="text-xs text-muted-foreground">
          Some insumos, operações e arrendamento e divida pela produção esperada.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="w-full sm:w-auto">
          {salvar.isPending ? "Salvando..." : "Salvar custo"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function LinhaCusto({ custo }: { custo: CustoProducao }) {
  const queryClient = useQueryClient();
  const { data: cotacoes } = useCotacoes();
  const cotacao = cotacoes?.get(custo.commodity);

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("custos_producao").delete().eq("id", custo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos"] });
      toast.success("Custo removido.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const preco = cotacao ? Number(cotacao.preco) : null;
  const margem = preco !== null ? preco - Number(custo.custo_por_saca) : null;
  const margemPct = margem !== null ? (margem / Number(custo.custo_por_saca)) * 100 : null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {COMMODITY_EMOJI[custo.commodity]}
          </span>
          <div>
            <p className="font-semibold">
              {COMMODITY_LABEL[custo.commodity]}{" "}
              <span className="text-sm font-normal text-muted-foreground">· safra {custo.safra}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Custo: {formatBRL(Number(custo.custo_por_saca))}
              {preco !== null && <> · Preço hoje: {formatBRL(preco)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {margem !== null && margemPct !== null ? (
            <div className="text-right">
              <p
                className={cn(
                  "font-bold tabular-nums",
                  margem >= 0 ? "text-sinal-vender" : "text-sinal-atencao",
                )}
              >
                {formatBRL(margem)}
              </p>
              <p className="text-xs text-muted-foreground">margem ({formatPct(margemPct)})</p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">sem cotação</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => excluir.mutate()}
            disabled={excluir.isPending}
            aria-label="Remover custo"
          >
            <Trash2 className="text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Margem() {
  const { data: custos, isLoading } = useCustos();
  const [aberto, setAberto] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calculadora de margem</h1>
          <p className="text-sm text-muted-foreground">
            Preço de mercado menos o seu custo — sem planilha.
          </p>
        </div>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Novo custo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Custo de produção</DialogTitle>
              <DialogDescription>
                Um custo por cultura e safra. Salvar de novo atualiza o valor.
              </DialogDescription>
            </DialogHeader>
            <FormCusto onSaved={() => setAberto(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : custos && custos.length > 0 ? (
        <div className="space-y-3">
          {custos.map((c) => (
            <LinhaCusto key={c.id} custo={c} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum custo cadastrado</CardTitle>
            <CardDescription>
              Cadastre o custo por saca da sua cultura e veja na hora se o preço de mercado cobre o
              seu custo — e com quanto de sobra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setAberto(true)}>
              <Plus /> Cadastrar meu primeiro custo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
