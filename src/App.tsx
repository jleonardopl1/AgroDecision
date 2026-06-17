import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireStaff } from "@/components/RequireStaff";
import { Toaster } from "@/components/ui/sonner";
import AdminCoop from "@/pages/AdminCoop";
import Alertas from "@/pages/Alertas";
import Carteira from "@/pages/Carteira";
import Chat from "@/pages/Chat";
import CoopPortal from "@/pages/CoopPortal";
import Dashboard from "@/pages/Dashboard";
import DesignSystem from "@/pages/DesignSystem";
import Equipe from "@/pages/admin/Equipe";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Margem from "@/pages/Margem";
import NotFound from "@/pages/NotFound";
import Perfil from "@/pages/Perfil";
import Relatorios from "@/pages/Relatorios";
import Signup from "@/pages/Signup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/c/:slug" element={<CoopPortal />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/design-system" element={<DesignSystem />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/carteira" element={<Carteira />} />
                <Route path="/app/chat" element={<Chat />} />
                <Route path="/app/margem" element={<Margem />} />
                <Route path="/app/alertas" element={<Alertas />} />
                <Route path="/app/relatorios" element={<Relatorios />} />
                <Route path="/app/perfil" element={<Perfil />} />
                <Route path="/app/admin" element={<AdminCoop />} />
                <Route element={<RequireStaff />}>
                  <Route path="/app/admin/equipe" element={<Equipe />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
