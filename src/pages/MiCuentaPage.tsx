import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function MiCuentaPage() {
  const { persona } = useAuth();
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  async function registrarHuella() {
    setRegistrando(true);
    setMensaje(null);

    try {
      const { error } = await supabase.auth.registerPasskey();

      if (error) {
        setMensaje('No se pudo registrar: ' + error.message);
        setMensajeEsError(true);
        return;
      }

      setMensaje(
        'Listo — a partir de ahora podés entrar con huella/Face ID/clave del dispositivo desde ' +
          'este mismo navegador y este mismo dispositivo.'
      );
      setMensajeEsError(false);
    } catch (e) {
      const texto = e instanceof Error ? e.message : String(e);
      if (!texto.toLowerCase().includes('abort')) {
        setMensaje('No se pudo registrar: ' + texto);
        setMensajeEsError(true);
      }
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="max-w-md space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">🔐 Mi cuenta</h1>
        <p className="text-sm text-superficie-400">
          {persona?.apellido}, {persona?.nombre} · DNI {persona?.dni}
        </p>
      </div>

      <section className="space-y-3 rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-superficie-900">
          Login con huella / Face ID
        </h2>
        <p className="text-sm text-superficie-600">
          Registrá este dispositivo una vez y la próxima vez vas a poder entrar sin escribir tu
          contraseña — usando la huella, Face ID, o la clave/PIN de este mismo dispositivo.
        </p>
        <p className="text-xs text-superficie-400">
          Es por dispositivo: si después entrás desde otro celular o computadora, vas a tener que
          registrarlo de nuevo ahí (o usar tu DNI y contraseña como siempre).
        </p>

        <button
          type="button"
          onClick={registrarHuella}
          disabled={registrando}
          className="min-h-touch w-full rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60"
        >
          {registrando ? 'Esperando confirmación…' : 'Registrar este dispositivo'}
        </button>

        {mensaje && (
          <p className={`text-sm ${mensajeEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>
            {mensaje}
          </p>
        )}
      </section>
    </div>
  );
}
