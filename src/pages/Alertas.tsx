import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  COMMODITIES,
  COMMODITY_EMOJI,
  COMMODITY_LABEL,
  type Commodity,
} from "@/lib/commodities";
import { formatBRL, formatDataHora } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";

type Alerta = Tables<"alertas">;
type TipoAlerta = "preco" | "margem" | "cambio" | "sinal_ia";

const TIPO_LABEL: Record<TipoAlerta, string> = {
  preco: "Preço da commodity",
  margem: "Margem (preço − custo)",
  cambio: "Câmbio",
  sinal_ia: "Mudança do sinal de IA",
};

function useAlertas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alertas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .eq("cooperado_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function descricaoAlerta(a: Alerta): string {
  const alvo = a.commodity ? COMMODITY_LABEL[a.commodity] : a.par_cambio ?? "";
  const operador = a.operador === ">=" ? "subir para" : "cair para";
  switch (a.tipo as TipoAlerta) {
    case "preco":
      return `${alvo} ${operador} ${formatBRL(Number(a.valor_alvo ?? 0))}`;
    case "margem":
      return `Margem de ${alvo} ${operador} ${formatBRL(Number(a.valor_alvo ?? 0))}`;
    case "cambio":
      return `${alvo} ${operador} R$ ${Number(a.valor_alvo ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    case "sinal_ia":
      return `Sinal de IA ${a.commodity ? `da ${alvo} ` : ""}mudar`;
    default:
      return a.tipo;
  }
}

function FormAlerta({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<TipoAlerta>("preco");
  const [commodity, setCommodity] = useState<Commodity>("soja");
  const [parCambio, setParCambio] = useState("USD/BRL");
  const [operador, setOperador] = useState<">=" | "<=">(">=");
  const [valor, setValor] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);

  const precisaValor = tipo !== "sinal_ia";
  const usaCommodity = tipo !== "cambio";

  const salvar = useMutation({
    mutationFn: async () => {
      const valorAlvo = Number(valor.replace(",", "."));
      if (precisaValor && (!valorAlvo || valorAlvo <= 0)) {
        throw new Error("Informe o valor de gatilho do alerta.");
      }
      const { error } = await supabase.from("alertas").insert({
        cooperado_id: user!.id,
        tipo,
        commodity: usaCommodity ? commodity : null,
        par_cambio: tipo === "cambio" ? parCambio : null,
        operador,
        valor_alvo: precisaValor ? valorAlvo : null,
        canais: whatsapp ? ["push", "whatsapp"] : ["push"],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
      toast.success("Alerta criado. Avisaremos quando disparar.");
      setValor("");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Me avise quando…</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAlerta)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIPO_LABEL) as TipoAlerta[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usaCommodity ? (
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
      ) : (
        <div className="space-y-2">
          <Label>Par de câmbio</Label>
          <Select value={parCambio} onValueChange={setParCambio}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD/BRL">USD/BRL (dólar)</SelectItem>
              <SelectItem value="EUR/BRL">EUR/BRL (euro)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {precisaValor && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Condição</Label>
            <Select value={operador} onValueChange={(v) => setOperador(v as ">=" | "<=")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">=">Subir para (≥)</SelectItem>
                <SelectItem value="<=">Cair para (≤)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex.: 135,00"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Receber também no WhatsApp</p>
          <p className="text-xs text-muted-foreground">Além da notificação no app.</p>
        </div>
        <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
      </div>

      <DialogFooter>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="w-full sm:w-auto">
          {salvar.isPending ? "Criando..." : "Criar alerta"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function LinhaAlerta({ alerta }: { alerta: Alerta }) {
  const queryClient = useQueryClient();

  const alternar = useMutation({
    mutationFn: async (ativo: boolean) => {
      const { error } = await supabase.from("alertas").update({ ativo }).eq("id", alerta.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alertas"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alertas").delete().eq("id", alerta.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
      toast.success("Alerta removido.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
            {alerta.commodity ? (
              <span aria-hidden>{COMMODITY_EMOJI[alerta.commodity]}</span>
            ) : (
              <BellRing className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{descricaoAlerta(alerta)}</p>
            <p className="text-xs text-muted-foreground">
              {alerta.canais.includes("whatsapp") ? "App + WhatsApp" : "App"}
              {alerta.ultimo_disparo && <> · último disparo {formatDataHora(alerta.ultimo_disparo)}</>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!alerta.ativo && <Badge variant="secondary">pausado</Badge>}
          <Switch
            checked={alerta.ativo}
            onCheckedChange={(v) => alternar.mutate(v)}
            aria-label="Ativar/pausar alerta"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => excluir.mutate()}
            disabled={excluir.isPending}
            aria-label="Remover alerta"
          >
            <Trash2 className="text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Alertas() {
  const { data: alertas, isLoading } = useAlertas();
  const [aberto, setAberto] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            O mercado trabalha por você: avisamos quando o gatilho bater.
          </p>
        </div>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus /> Novo alerta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo alerta</DialogTitle>
              <DialogDescription>Escolha o gatilho e como quer ser avisado.</DialogDescription>
            </DialogHeader>
            <FormAlerta onSaved={() => setAberto(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : alertas && alertas.length > 0 ? (
        <div className="space-y-3">
          {alertas.map((a) => (
            <LinhaAlerta key={a.id} alerta={a} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum alerta ainda</CardTitle>
            <CardDescription>
              Exemplo: “me avise quando a soja chegar a R$ 135” ou “quando o sinal da soja mudar”.
              Você não precisa olhar cotação todo dia — a gente olha por você.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setAberto(true)}>
              <Plus /> Criar meu primeiro alerta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
