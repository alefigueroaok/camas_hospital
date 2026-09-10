import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const { session, loginConDni } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ingresandoConHuella, setIngresandoConHuella] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: loginError } = await loginConDni(dni, password);
    if (loginError) setError(loginError);
    setSubmitting(false);
  }

  async function handleLoginConHuella() {
    setIngresandoConHuella(true);
    setError(null);

    try {
      const { error: passkeyError } = await supabase.auth.signInWithPasskey();

      if (passkeyError) {
        // El navegador cancela silenciosamente si el usuario aborta el
        // prompt del sistema operativo — no lo tratamos como un error real.
        if (passkeyError.name !== 'AbortError') {
          setError('No se pudo ingresar con huella: ' + passkeyError.message);
        }
      }
      // Si funciona, el cambio de sesión lo toma solo el AuthContext
      // (onAuthStateChange) y esta pantalla redirige sola.
    } catch (e) {
      // Algunos navegadores tiran la cancelación como excepción en vez de
      // como error de la respuesta — la tratamos igual, en silencio.
      const mensaje = e instanceof Error ? e.message : String(e);
      if (!mensaje.toLowerCase().includes('abort')) {
        setError('No se pudo ingresar con huella: ' + mensaje);
      }
    } finally {
      setIngresandoConHuella(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-institucional-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-card border border-institucional-700 bg-superficie-0 p-6 shadow-card"
      >
        <div>
          <h1 className="font-display text-lg font-semibold text-superficie-900">
            Gestión de Camas
          </h1>
          <p className="text-xs text-superficie-400">Ingresá con tu DNI</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="dni" className="text-sm text-superficie-600">DNI</label>
          <input
            id="dni"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            required
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Sin puntos ni espacios"
            className="min-h-touch w-full rounded-md border border-superficie-200 bg-superficie-0 px-3 text-sm text-superficie-900 outline-none focus:ring-2 focus:ring-institucional-600"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-superficie-600">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-touch w-full rounded-md border border-superficie-200 bg-superficie-0 px-3 text-sm text-superficie-900 outline-none focus:ring-2 focus:ring-institucional-600"
          />
        </div>

        {error && <p className="text-sm text-ocupada-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-touch w-full rounded-md bg-institucional-600 text-sm font-semibold text-white transition hover:bg-institucional-700 disabled:opacity-60"
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>

        <button
          type="button"
          onClick={handleLoginConHuella}
          disabled={ingresandoConHuella}
          className="min-h-touch w-full rounded-md border border-institucional-600 text-sm font-medium text-institucional-600 disabled:opacity-60"
        >
          {ingresandoConHuella ? 'Verificando…' : '🔐 Ingresar con huella / Face ID'}
        </button>

        <p className="text-center text-xs text-superficie-400">
          El botón de huella sólo funciona si ya la registraste antes desde "Mi cuenta", en este
          mismo dispositivo.
        </p>
      </form>
    </div>
  );
}
