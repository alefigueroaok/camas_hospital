import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function HospitalGuard() {
  const { persona, hospitalActual, asignaciones, loading } = useAuth();

  if (loading) return null;

  if (asignaciones.length === 0) {
    // Superusuario sin ningún hospital creado todavía: no hay nada para
    // elegir, lo dejamos pasar (va a ver el dashboard vacío, lo cual está
    // bien — el primer paso lógico ahí es crear un hospital).
    if (persona?.es_superusuario) return <Outlet />;

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
