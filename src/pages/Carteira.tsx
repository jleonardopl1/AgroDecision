import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  COMMODITIES,
  COMMODITY_EMOJI,
  COMMODITY_LABEL,
  COMMODITY_UNIDADE,
  type Commodity,
} from "@/lib/commodities";
import { formatBRL, formatData, formatPct } from "@/lib/format";
import { simularVenda } from "@/lib/simulador";
import { useCotacoes, useCustos } from "@/hooks/use-market";
import {
  useAdicionarFixacao,
  useCarteira,
  useFixacoes,
  useRemoverFixacao,
  useSalvarProducao,
} from "@/hooks/use-carteira";
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
const parseNum = (s: string) => Number(s.replace(",", "."));

function BarraProgresso({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-sinal-vender transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
      />
    </div>
  );
}

function FormProducao({ onSaved }: { onSaved: () => void }) {
  const salvar = useSalvarProducao();
  const [commodity, setCommodity] = useState<Commodity>("soja");
  const [safra, setSafra] = useState(SAFRA_ATUAL);
  const [producao, setProducao] = useState("");
  const [precoAlvo, setPrecoAlvo] = useState("");

  const submeter = () => {
    const sacas = producao.trim() ? parseNum(producao) : null;
    if (sacas !== null && (!sacas || sacas <= 0)) {
      toast.error("Informe uma produção válida em sacas.");
      return;
    }
    salvar.mutate(
      {
        commodity,
        safra: safra.trim() || SAFRA_ATUAL,
        producao_sacas: sacas,
        preco_alvo: precoAlvo.trim() ? parseNum(precoAlvo) : null,
      },
      {
        onSuccess: () => {
          toast.success("Produção salva.");
          onSaved();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="p-safra">Safra</Label>
          <Input id="p-safra" value={safra} onChange={(e) => setSafra(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-prod">Produção (sacas)</Label>
          <Input
            id="p-prod"
            inputMode="decimal"
            value={producao}
            onChange={(e) => setProducao(e.target.value)}
            placeholder="Ex.: 5000"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-alvo">Preço-alvo (R$/saca, opcional)</Label>
        <Input
          id="p-alvo"
          inputMode="decimal"
          value={precoAlvo}
          onChange={(e) => setPrecoAlvo(e.target.value)}
          placeholder="Ex.: 140"
        />
      </div>
      <DialogFooter>
        <Button onClick={submeter} disabled={salvar.isPending} className="w-full sm:w-auto">
          {salvar.isPending ? "Salvando..." : "Salvar produção"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function FormFixacao({ onSaved }: { onSaved: () => void }) {
  const adicionar = useAdicionarFixacao();
  const [commodity, setCommodity] = useState<Commodity>("soja");
  const [safra, setSafra] = useState(SAFRA_ATUAL);
  const [sacas, setSacas] = useState("");
  const [preco, setPreco] = useState("");

  const submeter = () => {
    const qSacas = parseNum(sacas);
    const qPreco = parseNum(preco);
    if (!qSacas || qSacas <= 0 || !qPreco || qPreco <= 0) {
      toast.error("Sacas e preço fixado devem ser positivos.");
      return;
    }
    adicionar.mutate(
      { commodity, safra: safra.trim() || SAFRA_ATUAL, sacas: qSacas, preco: qPreco },
      {
        onSuccess: () => {
          toast.success("Fixação registrada.");
          onSaved();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

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
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="f-safra">Safra</Label>
          <Input id="f-safra" value={safra} onChange={(e) => setSafra(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-sacas">Sacas</Label>
          <Input
            id="f-sacas"
            inputMode="decimal"
            value={sacas}
            onChange={(e) => setSacas(e.target.value)}
            placeholder="1000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-preco">R$/saca</Label>
          <Input
            id="f-preco"
            inputMode="decimal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="132,50"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submeter} disabled={adicionar.isPending} className="w-full sm:w-auto">
          {adicionar.isPending ? "Registrando..." : "Registrar fixação"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Simulador() {
  const { data: cotacoes } = useCotacoes();
  const { data: custos } = useCustos();
  const { posicoes } = useCarteira();
  const [commodity, setCommodity] = useState<Commodity>("soja");
  const [sacas, setSacas] = useState("");
  const [preco, setPreco] = useState("");

  const spot = cotacoes?.get(commodity);
  const precoSpot = spot ? Number(spot.preco) : null;
  const restante = posicoes.find((p) => p.commodity === commodity)?.restanteSacas ?? null;
  const custo = custos?.find((c) => c.commodity === commodity)?.custo_por_saca ?? null;

  const resultado = useMemo(() => {
    const precoUsado = preco.trim() ? parseNum(preco) : precoSpot;
    if (precoUsado === null || !Number.isFinite(precoUsado)) return null;
    const qSacas = sacas.trim() ? parseNum(sacas) : restante;
    if (qSacas === null || !Number.isFinite(qSacas) || qSacas <= 0) return null;
    return simularVenda({
      preco: precoUsado,
      sacas: qSacas,
      custoPorSaca: custo === null ? null : Number(custo),
    });
  }, [preco, sacas, precoSpot, restante, custo]);

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-5 w-5 text-primary" /> Se eu vender hoje, quanto recebo?
        </CardTitle>
        <CardDescription>Simule a venda com o preço de mercado ou um preço que você combinou.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            <Label htmlFor="s-sacas">Sacas</Label>
            <Input
              id="s-sacas"
              inputMode="decimal"
              value={sacas}
              onChange={(e) => setSacas(e.target.value)}
              placeholder={restante !== null ? `restam ${restante}` : "quantas?"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-preco">Preço (R$/saca)</Label>
            <Input
              id="s-preco"
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder={precoSpot !== null ? `spot ${precoSpot}` : "—"}
            />
          </div>
        </div>

        {resultado ? (
          <div className="rounded-md bg-secondary/60 p-4">
            <p className="text-sm text-muted-foreground">
              Vendendo {resultado.sacas.toLocaleString("pt-BR")} {COMMODITY_UNIDADE[commodity].replace("R$/", "")} a{" "}
              {formatBRL(resultado.precoUsado)}:
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{formatBRL(resultado.receita)}</p>
            {resultado.lucro !== null && resultado.margemPct !== null && (
              <p
                className={cn(
                  "mt-1 text-sm font-medium",
                  resultado.lucro >= 0 ? "text-sinal-vender" : "text-sinal-atencao",
                )}
              >
                Lucro estimado {formatBRL(resultado.lucro)} ({formatPct(resultado.margemPct)} de margem)
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Escolha a cultura e informe as sacas (ou registre sua produção para usar o restante em aberto).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Carteira() {
  const { posicoes, isLoading } = useCarteira();
  const { data: cotacoes } = useCotacoes();
  const { data: fixacoes } = useFixacoes();
  const remover = useRemoverFixacao();
  const queryClient = useQueryClient();
  const [prodAberto, setProdAberto] = useState(false);
  const [fixAberto, setFixAberto] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minha carteira</h1>
          <p className="text-sm text-muted-foreground">
            Quanto você já fixou, quanto falta vender e quanto recebe se vender hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={prodAberto} onOpenChange={setProdAberto}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus /> Produção
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Produção esperada</DialogTitle>
                <DialogDescription>Quanto você espera colher — base do % já vendido.</DialogDescription>
              </DialogHeader>
              <FormProducao onSaved={() => setProdAberto(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={fixAberto} onOpenChange={setFixAberto}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Fixação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova fixação</DialogTitle>
                <DialogDescription>Registre uma venda/fixação que você já fez.</DialogDescription>
              </DialogHeader>
              <FormFixacao onSaved={() => setFixAberto(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Simulador />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : posicoes.length > 0 ? (
        <div className="space-y-3">
          {posicoes.map((p) => {
            const spot = cotacoes?.get(p.commodity);
            const precoSpot = spot ? Number(spot.preco) : null;
            const valorRestante =
              precoSpot !== null && p.restanteSacas !== null ? p.restanteSacas * precoSpot : null;
            return (
              <Card key={`${p.commodity}-${p.safra}`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {COMMODITY_EMOJI[p.commodity]} {COMMODITY_LABEL[p.commodity]}{" "}
                      <span className="text-sm font-normal text-muted-foreground">· safra {p.safra}</span>
                    </span>
                    {p.pctVendido !== null && (
                      <span className="text-sm font-bold tabular-nums">{Math.round(p.pctVendido * 100)}% vendido</span>
                    )}
                  </div>

                  {p.pctVendido !== null && <BarraProgresso pct={p.pctVendido} />}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Fixado</p>
                      <p className="font-medium tabular-nums">{p.fixadoSacas.toLocaleString("pt-BR")} sc</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Restante</p>
                      <p className="font-medium tabular-nums">
                        {p.restanteSacas !== null ? `${p.restanteSacas.toLocaleString("pt-BR")} sc` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Preço médio fixado</p>
                      <p className="font-medium tabular-nums">
                        {p.precoMedioFixado !== null ? formatBRL(p.precoMedioFixado) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vale hoje (restante)</p>
                      <p className="flex items-center gap-1 font-medium tabular-nums text-primary">
                        {valorRestante !== null ? (
                          <>
                            <TrendingUp className="h-3.5 w-3.5" /> {formatBRL(valorRestante)}
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Monte sua carteira</CardTitle>
            <CardDescription>
              Cadastre sua produção esperada e as fixações que já fez. Aí você vê, a qualquer momento, quanto
              já vendeu, quanto falta e quanto recebe se vender hoje — sem precisar lembrar de cabeça.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => setProdAberto(true)}>
              <Plus /> Produção
            </Button>
            <Button onClick={() => setFixAberto(true)}>
              <Plus /> Primeira fixação
            </Button>
          </CardContent>
        </Card>
      )}

      {fixacoes && fixacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fixações registradas</CardTitle>
            <CardDescription>Cada venda parcial que você lançou (no app ou pelo chat).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {fixacoes.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <span className="font-medium">
                    {COMMODITY_EMOJI[f.commodity]} {COMMODITY_LABEL[f.commodity]}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    · {Number(f.sacas).toLocaleString("pt-BR")} sc a {formatBRL(Number(f.preco))} · {formatData(f.fixado_em)}
                    {f.canal !== "app" && ` · via ${f.canal}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    remover.mutate(f.id, {
                      onSuccess: () => {
                        toast.success("Fixação removida.");
                        queryClient.invalidateQueries({ queryKey: ["fixacoes"] });
                      },
                      onError: (e: Error) => toast.error(e.message),
                    })
                  }
                  aria-label="Remover fixação"
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
