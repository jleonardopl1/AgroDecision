import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  Calculator,
  FileText,
  Home,
  Leaf,
  LogOut,
  MessageCircle,
  Settings,
  User as UserIcon,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth, useCooperado } from "@/hooks/use-auth";
import { CoopThemeProvider } from "@/components/CoopThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { to: "/app", label: "Hoje", icon: Home, end: true },
  { to: "/app/carteira", label: "Carteira", icon: Wallet },
  { to: "/app/chat", label: "Conversa", icon: MessageCircle },
  { to: "/app/alertas", label: "Alertas", icon: Bell },
  { to: "/app/relatorios", label: "Relatórios", icon: FileText },
];

function NavLinks({ vertical = false }: { vertical?: boolean }) {
  return (
    <>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md text-sm font-medium transition-colors",
              vertical
                ? "flex-col gap-1 px-3 py-1.5 text-[11px]"
                : "px-3 py-2",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Icon className={vertical ? "h-5 w-5" : "h-4 w-4"} />
          {label}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout() {
  const { signOut } = useAuth();
  const { data: cooperado } = useCooperado();
  const navigate = useNavigate();
  const coop = cooperado?.cooperativa;
  const isAdmin = cooperado?.role === "admin_coop";

  const handleSignOut = async () => {
    await signOut();
    navigate("/entrar");
  };

  return (
    <CoopThemeProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
            <NavLink to="/app" className="flex min-w-0 items-center gap-2">
              {coop?.logo_url ? (
                <img
                  src={coop.logo_url}
                  alt={coop.nome}
                  className="h-8 w-8 shrink-0 rounded-md object-contain"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Leaf className="h-4 w-4" />
                </span>
              )}
              <span className="truncate font-bold text-foreground">
                {coop ? coop.nome : "AgroDecision"}
              </span>
              {coop && (
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                  · AgroDecision
                </span>
              )}
            </NavLink>

            <nav className="hidden items-center md:flex">
              <NavLinks />
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  <span className="truncate">{cooperado?.nome ?? "Minha conta"}</span>
                  <Badge variant={cooperado?.plano === "pro" ? "default" : "secondary"}>
                    {cooperado?.plano === "pro" ? "Pro" : "Free"}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/app/margem")}>
                  <Calculator /> Calculadora de margem
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/app/perfil")}>
                  <UserIcon /> Meu perfil
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onSelect={() => navigate("/app/admin")}>
                    <Settings /> Painel da cooperativa
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-10">
          <Outlet />
        </main>

        {/* Navegação inferior — mobile first (produtor no campo, uma mão no celular) */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          <NavLinks vertical />
        </nav>
      </div>
    </CoopThemeProvider>
  );
}
