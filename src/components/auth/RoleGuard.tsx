import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { RolSistema } from '@/types/database.types';

interface RoleGuardProps {
  allowedRoles: RolSistema[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { persona, rolActual } = useAuth();

  if (persona?.es_superusuario) return <Outlet />;
  if (!rolActual) return null;
  if (!allowedRoles.includes(rolActual)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
