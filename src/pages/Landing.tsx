import { Link, Navigate } from "react-router-dom";
import { Bell, Calculator, Leaf, LineChart, Sparkles, Users } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SinalBadge } from "@/components/SinalBadge";

const FEATURES = [
  {
    icon: Sparkles,
    titulo: "Sinal de venda com IA",
    texto: "VENDER, AGUARDAR ou ATENÇÃO — com o porquê em linguagem do campo, sem jargão.",
  },
  {
    icon: Calculator,
    titulo: "Margem real, não só preço",
    texto: "Cadastre seu custo por saca e veja na hora quanto sobra em cada cotação.",
  },
  {
    icon: Bell,
    titulo: "Alertas que trabalham por você",
    texto: "“Me avise quando a soja chegar a R$ 135.” No app e no WhatsApp.",
  },
  {
    icon: LineChart,
    titulo: "Cotações e câmbio ao vivo",
    texto: "CEPEA, B3 e dólar em uma tela só, atualizados ao longo do dia.",
  },
];

export default function Landing() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-bold">AgroDecision</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/entrar">Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/cadastro">Criar conta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              Vender, aguardar ou prestar atenção?{" "}
              <span className="text-primary">Saiba em 30 segundos.</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Preço, câmbio, custo e margem em uma tela — com um sinal claro de timing de venda
              para soja, milho, café, algodão e boi. Feito para o produtor, distribuído pela sua
              cooperativa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/cadastro">Começar grátis</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/c/demo">Ver portal de cooperativa</Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> Sua cooperativa oferece o AgroDecision? Use o link dela
              para entrar já vinculado.
            </p>
          </div>

          {/* Mock do sinal — a promessa do produto em um cartão */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl" aria-hidden>
                    🌱
                  </span>
                  <div>
                    <p className="text-lg font-semibold">Soja</p>
                    <p className="text-xs text-muted-foreground">CEPEA · agora</p>
                  </div>
                </div>
                <SinalBadge sinal="VENDER" size="lg" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">R$ 128,50</span>
                <span className="text-sm text-muted-foreground">/saca</span>
                <span className="text-sm font-medium text-sinal-vender">+1,2%</span>
              </div>
              <div className="rounded-md bg-secondary/60 p-3">
                <p className="text-sm font-semibold">VENDER PARCIAL 30%</p>
                <p className="text-sm text-foreground/80">
                  A soja está 8% acima da média dos últimos 5 anos e o dólar está firme. Bom
                  momento para fixar parte da produção.
                </p>
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">Sua margem: </span>
                <span className="font-semibold text-sinal-vender">R$ 39,00/saca (+43,6%)</span>
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, titulo, texto }) => (
            <Card key={titulo}>
              <CardContent className="space-y-2 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-semibold">{titulo}</p>
                <p className="text-sm text-muted-foreground">{texto}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        AgroDecision · inteligência de mercado para o produtor rural
      </footer>
    </div>
  );
}
