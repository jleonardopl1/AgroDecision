import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  COMMODITIES,
  COMMODITY_EMOJI,
  COMMODITY_LABEL,
  type Commodity,
} from "@/lib/commodities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const coopSlug = params.get("coop") ?? "demo";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [culturas, setCulturas] = useState<Commodity[]>([]);
  const [enviando, setEnviando] = useState(false);

  const { data: branding } = useQuery({
    queryKey: ["branding", coopSlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_coop_branding", { p_slug: coopSlug });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const toggleCultura = (c: Commodity) => {
    setCulturas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
          cooperativa_slug: coopSlug,
          culturas,
        },
      },
    });
    setEnviando(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este e-mail já tem conta. Use a tela de entrar."
          : error.message,
      );
      return;
    }
    if (data.session) {
      navigate("/app", { replace: true });
    } else {
      toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      navigate("/entrar");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Link to="/" className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-6 w-6" />
          </Link>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription className="flex flex-col items-center gap-2">
            <span>Leva menos de um minuto.</span>
            {branding && (
              <Badge variant="secondary">
                Cooperativa: {branding.nome}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>O que você produz?</Label>
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
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Criando conta..." : "Começar a usar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/entrar" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
