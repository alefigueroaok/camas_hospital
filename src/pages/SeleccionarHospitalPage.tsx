import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function SeleccionarHospitalPage() {
  const { persona, asignaciones, hospitalActual, seleccionarHospital, signOut } = useAuth();

  if (hospitalActual) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-institucional-950 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="font-display text-lg font-semibold text-white">
            ¿En qué hospital vas a trabajar hoy?
          </h1>
          <p className="text-sm text-institucional-100">
            Hola {persona?.nombre} — elegí un hospital para continuar.
          </p>
        </div>

        <div className="space-y-2">
          {asignaciones.map((a) => (
            <button
              key={a.hospital_id}
              type="button"
              onClick={() => seleccionarHospital(a.hospital_id)}
              className="flex min-h-touch w-full items-center justify-between rounded-card border border-superficie-200 bg-superficie-0 px-4 py-3 text-left shadow-card transition hover:border-institucional-500"
            >
              <span>
                <span className="block font-medium text-superficie-900">{a.hospital.nombre}</span>
                <span className="block text-xs text-superficie-400">
                  {a.profesion_funcion} · {a.rol}
                </span>
              </span>
              <span className="text-institucional-600" aria-hidden>→</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={signOut}
          className="w-full text-center text-xs text-institucional-100 underline underline-offset-2"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
