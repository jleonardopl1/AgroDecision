/**
 * AgroDecision · Design System (style guide vivo)
 *
 * Página de referência da identidade visual: tokens (cores, tipografia, raio,
 * sombra, espaçamento) e os componentes base. Fonte da verdade dos tokens:
 *   - src/lib/design-tokens.ts  (valores de marca)
 *   - src/index.css             (CSS vars / tema shadcn)
 *   - tailwind.config.ts        (mapeamento utilitário)
 *
 * Rota pública: /design-system
 */
import { useState, type ReactNode } from "react";

import { SinalBadge } from "@/components/SinalBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { designTokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  label,
  sub,
  swatchClass,
  hex,
  bordered,
}: {
  label: string;
  sub?: string;
  swatchClass: string;
  hex?: string;
  bordered?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={cn("h-16 w-full", swatchClass, bordered && "border-b border-border")} />
      <div className="space-y-0.5 p-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
        {hex ? <p className="font-mono text-xs text-muted-foreground">{hex}</p> : null}
      </div>
    </div>
  );
}

const CORES_MARCA = [
  { label: "Verde-campo", sub: "Primária · confiança, campo", swatchClass: "bg-campo", hex: designTokens.cores.verdeCampo },
  { label: "Verde-claro", sub: "Fundos suaves", swatchClass: "bg-campo-claro", hex: designTokens.cores.verdeClaro, bordered: true },
  { label: "Laranja-colheita", sub: "Accent · colheita", swatchClass: "bg-colheita", hex: designTokens.cores.laranjaColheita },
  { label: "Atenção", sub: "Sinal de alerta", swatchClass: "bg-sinal-atencao", hex: designTokens.cores.atencao },
];

const CORES_SEMANTICAS = [
  { label: "primary", swatchClass: "bg-primary" },
  { label: "secondary", swatchClass: "bg-secondary", bordered: true },
  { label: "accent", swatchClass: "bg-accent" },
  { label: "muted", swatchClass: "bg-muted", bordered: true },
  { label: "destructive", swatchClass: "bg-destructive" },
  { label: "card", swatchClass: "bg-card", bordered: true },
  { label: "background", swatchClass: "bg-background", bordered: true },
  { label: "border", swatchClass: "bg-border" },
];

const TIPOGRAFIA = [
  { nome: "Display", cls: "text-4xl font-extrabold tracking-tight", amostra: "Venda no momento certo" },
  { nome: "Título (h1)", cls: "text-3xl font-bold", amostra: "Painel de cotações" },
  { nome: "Subtítulo (h2)", cls: "text-2xl font-semibold", amostra: "Soja · Paranaguá/PR" },
  { nome: "Corpo", cls: "text-base", amostra: "Preço, câmbio, custo e margem em uma só tela." },
  { nome: "Pequeno", cls: "text-sm text-muted-foreground", amostra: "Atualizado a cada 15 minutos." },
  { nome: "Legenda", cls: "text-xs uppercase tracking-wide text-muted-foreground", amostra: "Fonte: CEPEA/B3" },
];

const RAIOS = [
  { nome: "sm", cls: "rounded-sm" },
  { nome: "md", cls: "rounded-md" },
  { nome: "lg (--radius)", cls: "rounded-lg" },
  { nome: "full", cls: "rounded-full" },
];

const SOMBRAS = [
  { nome: "sm", cls: "shadow-sm" },
  { nome: "DEFAULT", cls: "shadow" },
  { nome: "md", cls: "shadow-md" },
  { nome: "lg", cls: "shadow-lg" },
];

const ESPACAMENTOS = [1, 2, 3, 4, 6, 8, 12];

export default function DesignSystem() {
  const [alertaOn, setAlertaOn] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-campo text-white">
        <div className="container space-y-3 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            AgroDecision · Design System
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">Identidade visual do campo</h1>
          <p className="max-w-2xl text-white/80">
            Tokens e componentes que mantêm o produto consistente: preço, câmbio e o sinal de
            decisão (VENDER · AGUARDAR · ATENÇÃO) com a mesma linguagem em toda a plataforma.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <SinalBadge sinal="VENDER" size="lg" />
            <SinalBadge sinal="AGUARDAR" size="lg" />
            <SinalBadge sinal="ATENCAO" size="lg" />
          </div>
        </div>
      </header>

      <main className="container space-y-12 py-12">
        <Section
          title="Cores de marca"
          description="Fonte da verdade: src/lib/design-tokens.ts. Primária e accent podem ser sobrescritas em runtime pelo co-branding da cooperativa (CoopThemeProvider)."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CORES_MARCA.map((c) => (
              <Swatch key={c.label} {...c} />
            ))}
          </div>
        </Section>

        <Section
          title="Sinais de decisão"
          description="O coração do produto: um sinal claro, explicado em linguagem do campo."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { sinal: "VENDER", desc: "Momento favorável de venda." },
              { sinal: "AGUARDAR", desc: "Tendência ainda indefinida." },
              { sinal: "ATENCAO", desc: "Risco/oscilação relevante." },
            ].map((s) => (
              <Card key={s.sinal}>
                <CardContent className="space-y-3 p-5">
                  <SinalBadge sinal={s.sinal} size="lg" />
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Cores semânticas" description="Tokens shadcn mapeados em src/index.css (CSS vars).">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CORES_SEMANTICAS.map((c) => (
              <Swatch key={c.label} label={c.label} swatchClass={c.swatchClass} bordered={c.bordered} />
            ))}
          </div>
        </Section>

        <Section title="Tipografia" description={`Família ${designTokens.fontFamily} · system-ui como fallback.`}>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {TIPOGRAFIA.map((t) => (
                <div
                  key={t.nome}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <span className={t.cls}>{t.amostra}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.nome}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>

        <Section title="Raio, sombra e espaçamento" description={`Raio base ${designTokens.radiusPx}px (--radius).`}>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Raio</p>
              <div className="flex flex-wrap gap-3">
                {RAIOS.map((r) => (
                  <div key={r.nome} className="text-center">
                    <div className={cn("h-14 w-14 border border-campo/30 bg-campo-claro", r.cls)} />
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{r.nome}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Sombra</p>
              <div className="flex flex-wrap gap-4">
                {SOMBRAS.map((s) => (
                  <div key={s.nome} className="text-center">
                    <div className={cn("h-14 w-14 rounded-lg bg-card", s.cls)} />
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{s.nome}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Espaçamento</p>
              <div className="space-y-2">
                {ESPACAMENTOS.map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="h-3 bg-colheita" style={{ width: `${n * 0.25}rem` }} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {n} · {n * 0.25}rem
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Componentes" description="Base shadcn/ui ajustada à paleta verde-campo.">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Botões</h3>
            <div className="flex flex-wrap gap-3">
              <Button>Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destrutivo</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeno</Button>
              <Button size="default">Padrão</Button>
              <Button size="lg">Grande</Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Badges</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <SinalBadge sinal="VENDER" />
              <SinalBadge sinal="AGUARDAR" />
              <SinalBadge sinal="ATENCAO" />
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Formulário</h3>
              <div className="space-y-2">
                <Label htmlFor="ds-custo">Custo por saca (R$)</Label>
                <Input id="ds-custo" placeholder="Ex.: 98,50" inputMode="decimal" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Alerta de preço</p>
                  <p className="text-xs text-muted-foreground">Notificar quando atingir o alvo.</p>
                </div>
                <Switch checked={alertaOn} onCheckedChange={setAlertaOn} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Abas</h3>
              <Tabs defaultValue="spot">
                <TabsList>
                  <TabsTrigger value="spot">Físico</TabsTrigger>
                  <TabsTrigger value="futuro">Futuro B3</TabsTrigger>
                </TabsList>
                <TabsContent value="spot" className="pt-3 text-sm text-muted-foreground">
                  Indicador CEPEA/ESALQ, atualizado diariamente.
                </TabsContent>
                <TabsContent value="futuro" className="pt-3 text-sm text-muted-foreground">
                  Contratos futuros da B3 (fim-de-dia).
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Card</h3>
            <Card className="max-w-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Soja</CardTitle>
                  <SinalBadge sinal="VENDER" />
                </div>
                <CardDescription>Paranaguá/PR · CEPEA</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-campo">R$ 128,50</p>
                <p className="text-sm text-muted-foreground">por saca · +1,2% hoje</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Ver análise</Button>
              </CardFooter>
            </Card>
          </div>
        </Section>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          Tokens: <code className="font-mono">src/lib/design-tokens.ts</code> ·{" "}
          <code className="font-mono">src/index.css</code> ·{" "}
          <code className="font-mono">tailwind.config.ts</code> — alterações de marca devem partir daí.
        </footer>
      </main>
    </div>
  );
}
