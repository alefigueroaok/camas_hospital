import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function Layout() {
  const { persona, hospitalActual, rolActual, asignaciones, signOut, cambiarHospital } = useAuth();
  const navigate = useNavigate();

  function handleCambiarHospital() {
    cambiarHospital();
    navigate('/seleccionar-hospital');
  }

  return (
    <div className="min-h-screen bg-superficie-50">
      <nav className="flex items-center justify-between bg-institucional-900 px-6 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold tracking-wide text-white">CAMAS</span>
          {hospitalActual && (
            <span className="text-xs text-institucional-100">· {hospitalActual.nombre}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-institucional-100">
          <span className="font-mono text-xs">
            {persona?.nombre} · {rolActual}
          </span>
          {asignaciones.length > 1 && (
            <button
              onClick={handleCambiarHospital}
              className="rounded-md px-2 py-1 text-white underline-offset-2 hover:underline"
            >
              Cambiar hospital
            </button>
          )}
          <button
            onClick={signOut}
            className="rounded-md px-2 py-1 text-white underline-offset-2 hover:underline"
          >
            Salir
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
