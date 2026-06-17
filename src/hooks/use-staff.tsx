import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

// As tabelas de RBAC (staff_members, ...) entram via migration 0008.
// Os tipos gerados (types.ts) so as incluem apos `npm run db:types`;
// ate la, usamos o client sem tipagem nessas chamadas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface StaffInfo {
  isStaff: boolean;
  isMaster: boolean;
}

/** Identidade de equipe interna do usuario logado (staff/master). */
export function useStaff() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ['staff', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StaffInfo> => {
      const { data, error } = await sb
        .from('staff_members')
        .select('is_master, ativo')
        .eq('id', user!.id)
        .maybeSingle();
      // Tabela inexistente (migration nao aplicada) ou sem registro => nao e staff.
      if (error || !data || data.ativo === false) return { isStaff: false, isMaster: false };
      return { isStaff: true, isMaster: !!data.is_master };
    },
  });

  return {
    loading: authLoading || query.isLoading,
    isStaff: query.data?.isStaff ?? false,
    isMaster: query.data?.isMaster ?? false,
  };
}
