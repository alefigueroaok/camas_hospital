import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function HospitalGuard() {
  const { persona, hospitalActual, asignaciones, loading } = useAuth();

  if (loading) return null;
  if (persona?.es_superusuario) return <Outlet />;

  if (asignaciones.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-superficie-50 p-6 text-center">
        <p className="max-w-sm text-sm text-superficie-600">
          Todavía no tenés ningún hospital asignado. Pedile a un administrador que te dé de alta.
        </p>
      </div>
    );
  }

  if (!hospitalActual) return <Navigate to="/seleccionar-hospital" replace />;
  return <Outlet />;
}
