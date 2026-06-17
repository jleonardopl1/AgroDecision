import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';

import { useStaff } from '@/hooks/use-staff';

/** Protege rotas internas da AgroDecision: exige ser membro da equipe (staff). */
export function RequireStaff() {
  const { isStaff, loading } = useStaff();

  if (loading) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (!isStaff) return <Navigate to='/app' replace />;

  return <Outlet />;
}
