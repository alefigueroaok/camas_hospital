import { useAuth } from '@/contexts/AuthContext';

export function SuperusuarioPage() {
  const { persona, signOut } = useAuth();

  return (
    <div className="min-h-screen space-y-4 bg-superficie-50 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-superficie-900">
            Panel de superusuario
          </h1>
          <p className="text-sm text-superficie-400">{persona?.nombre}</p>
        </div>
        <button onClick={signOut} className="text-sm text-institucional-600 underline underline-offset-2">
          Salir
        </button>
      </header>
      <p className="text-sm text-superficie-600">
        Placeholder — acá va la creación de hospitales (RPC <code className="font-mono">crear_hospital</code>)
        y la gestión global. Todavía no implementado en el frontend.
      </p>
    </div>
  );
}
