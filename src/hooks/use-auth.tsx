import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** true enquanto a sessão inicial ainda não foi resolvida. */
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener primeiro, depois getSession — evita perder eventos no intervalo.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export type CooperadoComCoop = Tables<"cooperados"> & {
  cooperativa: Tables<"cooperativas"> | null;
};

/** Perfil do cooperado logado + cooperativa (para branding e plano). */
// eslint-disable-next-line react-refresh/only-export-components
export function useCooperado() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cooperado", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CooperadoComCoop | null> => {
      const { data, error } = await supabase
        .from("cooperados")
        .select("*, cooperativa:cooperativas(*)")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as CooperadoComCoop | null;
    },
  });
}
