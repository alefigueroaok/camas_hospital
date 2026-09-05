import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/constants/roles';

interface ItemMenu {
  to: string;
  label: string;
}

export function Layout() {
  const { persona, hospitalActual, rolActual, asignaciones, signOut, cambiarHospital } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  function handleCambiarHospital() {
    setMenuAbierto(false);
    cambiarHospital();
    navigate('/seleccionar-hospital');
  }

  function handleSignOut() {
    setMenuAbierto(false);
    signOut();
  }

  const itemsAdministracion: ItemMenu[] = [
    { to: '/sectores', label: 'Sectores y camas' },
    { to: '/personal', label: 'Personal' },
    { to: '/alta-personal', label: 'Dar de alta personal' },
    { to: '/novedades', label: 'Novedades' },
  ];

  const itemsMedicoAdmin: ItemMenu[] = [
    { to: '/derivar', label: 'Derivar paciente' },
    { to: '/solicitudes', label: 'Solicitudes' },
  ];

  const itemsComunes: ItemMenu[] = [{ to: '/historial', label: 'Historial de altas' }];

  const items: ItemMenu[] = [
    { to: '/dashboard', label: 'Tablero de camas' },
    ...(rolActual === ROLES.MEDICO || rolActual === ROLES.ADMINISTRACION ? itemsMedicoAdmin : []),
    ...(rolActual === ROLES.ADMINISTRACION ? itemsAdministracion : []),
    ...itemsComunes,
  ];

  return (
    <div className="min-h-screen bg-superficie-50">
      <nav className="relative bg-institucional-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              className="rounded-md p-2 text-white hover:bg-institucional-800"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
              <span className="mt-1 block h-0.5 w-5 bg-current" />
            </button>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-sm font-semibold tracking-wide text-white">
                CAMAS
              </span>
              {hospitalActual && (
                <span className="hidden text-xs text-institucional-100 sm:inline">
                  · {hospitalActual.nombre}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-institucional-100">
            <span className="hidden font-mono text-xs sm:inline">
              {persona?.nombre} · {rolActual}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-md px-2 py-1 text-white underline-offset-2 hover:underline"
            >
              Salir
            </button>
          </div>
        </div>

        {menuAbierto && (
          <>
            {/* Fondo para cerrar el menú al tocar afuera */}
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
              className="fixed inset-0 z-40 cursor-default bg-superficie-900/30"
            />
            <div className="absolute left-4 top-full z-50 mt-2 w-64 overflow-hidden rounded-card border border-superficie-200 bg-superficie-0 shadow-card">
              {hospitalActual && (
                <div className="border-b border-superficie-200 px-4 py-3">
                  <p className="text-xs text-superficie-400">{persona?.nombre}</p>
                  <p className="text-sm font-medium text-superficie-900">{hospitalActual.nombre}</p>
                </div>
              )}

              <div className="py-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-sm ${
                        isActive
                          ? 'bg-institucional-100 font-medium text-institucional-600'
                          : 'text-superficie-600 hover:bg-superficie-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {asignaciones.length > 1 && (
                <div className="border-t border-superficie-200 py-1">
                  <button
                    type="button"
                    onClick={handleCambiarHospital}
                    className="block w-full px-4 py-2.5 text-left text-sm text-superficie-600 hover:bg-superficie-100"
                  >
                    Cambiar hospital
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Outlet />
    </div>
  );
}
