import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/constants/roles';

export function DashboardPage() {
  const { persona, hospitalActual, rolActual } = useAuth();

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">
          {hospitalActual?.nombre}
        </h1>
        <p className="text-sm text-superficie-400">
          Hola {persona?.nombre} — rol: {rolActual}
        </p>
      </header>

      <p className="text-sm text-superficie-600">
        Esto confirma que el login, la selección de hospital y el rol ya están andando. El
        tablero de camas en tiempo real se conecta acá en la próxima fase.
      </p>

      {rolActual === ROLES.ADMINISTRACION && (
        <div className="flex flex-wrap gap-3">
          <Link
            to="/alta-personal"
            className="inline-block rounded-md bg-institucional-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Dar de alta personal
          </Link>
          <Link
            to="/sectores"
            className="inline-block rounded-md border border-institucional-600 px-4 py-2 text-sm font-semibold text-institucional-600"
          >
            Sectores y camas
          </Link>
        </div>
      )}
    </div>
  );
}

