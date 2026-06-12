import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <p className="text-xl font-semibold">Página não encontrada</p>
      <p className="text-muted-foreground">O caminho que você acessou não existe.</p>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </div>
  );
}
