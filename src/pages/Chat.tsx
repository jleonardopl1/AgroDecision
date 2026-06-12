import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  useConectarCanal,
  useConversa,
  useDesconectarCanal,
  useEnviarMensagem,
  useVinculos,
  type Canal,
} from "@/hooks/use-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SUGESTOES = [
  "Quanto já fixei de soja?",
  "Se eu vender hoje, quanto recebo?",
  "Quanto falta vender da minha safra?",
  "Me avise se a soja chegar a R$ 135",
];

const CANAL_LABEL: Record<Canal, string> = { whatsapp: "WhatsApp", telegram: "Telegram" };

function ConectarCanais() {
  const { data: vinculos } = useVinculos();
  const conectar = useConectarCanal();
  const desconectar = useDesconectarCanal();

  const status = (canal: Canal) => vinculos?.find((v) => v.canal === canal) ?? null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["whatsapp", "telegram"] as Canal[]).map((canal) => {
        const v = status(canal);
        return (
          <Card key={canal}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <Smartphone className="h-4 w-4 text-primary" /> {CANAL_LABEL[canal]}
                </span>
                {v?.verificado ? (
                  <Badge>conectado</Badge>
                ) : v ? (
                  <Badge variant="secondary">aguardando código</Badge>
                ) : null}
              </div>

              {v?.verificado ? (
                <Button variant="outline" size="sm" onClick={() => desconectar.mutate(canal)}>
                  Desconectar
                </Button>
              ) : v ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Envie este código para o nosso bot no {CANAL_LABEL[canal]}:
                  </p>
                  <p className="rounded-md bg-muted px-3 py-2 text-center text-lg font-bold tracking-widest">
                    {v.codigo}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      conectar.mutate(canal, { onError: (e: Error) => toast.error(e.message) })
                    }
                  >
                    Gerar outro código
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  disabled={conectar.isPending}
                  onClick={() =>
                    conectar.mutate(canal, { onError: (e: Error) => toast.error(e.message) })
                  }
                >
                  Conectar {CANAL_LABEL[canal]}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface Bolha {
  role: "user" | "assistant";
  conteudo: string;
}

export default function Chat() {
  const { data: mensagens } = useConversa();
  const enviar = useEnviarMensagem();
  const [texto, setTexto] = useState("");
  const [pendente, setPendente] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  const bolhas: Bolha[] = [
    ...(mensagens ?? []).map((m) => ({ role: m.role as "user" | "assistant", conteudo: m.conteudo })),
    ...(pendente ? [{ role: "user" as const, conteudo: pendente }] : []),
  ];

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bolhas.length, enviar.isPending]);

  const submeter = (mensagem: string) => {
    const t = mensagem.trim();
    if (!t || enviar.isPending) return;
    setTexto("");
    setPendente(t);
    enviar.mutate(t, {
      onError: (e: Error) => toast.error(e.message),
      onSettled: () => setPendente(null),
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submeter(texto);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversa</h1>
        <p className="text-sm text-muted-foreground">
          Seu consultor comercial de IA — pergunte, simule vendas e configure alertas conversando.
        </p>
      </div>

      <Card className="flex h-[60vh] flex-col">
        <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {bolhas.length === 0 && !enviar.isPending ? (
            <div className="m-auto max-w-sm space-y-4 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                Me conte sua cultura, quanto espera colher e seu custo por saca — eu monto seu cenário e te
                ajudo a vender no melhor momento.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submeter(s)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            bolhas.map((b, i) => (
              <div
                key={i}
                className={cn("flex", b.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    b.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-secondary-foreground",
                  )}
                >
                  {b.conteudo}
                </div>
              </div>
            ))
          )}

          {enviar.isPending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm text-muted-foreground">
                digitando…
              </div>
            </div>
          )}
          <div ref={fimRef} />
        </CardContent>

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t p-3">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua pergunta…"
            disabled={enviar.isPending}
          />
          <Button type="submit" size="icon" disabled={enviar.isPending || !texto.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Falar pelo WhatsApp ou Telegram</h2>
        <p className="text-sm text-muted-foreground">
          Conecte um canal para receber alertas e conversar com o consultor direto no seu mensageiro.
        </p>
        <ConectarCanais />
      </div>
    </div>
  );
}
