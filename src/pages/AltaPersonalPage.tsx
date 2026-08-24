import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { dniToEmail } from '@/lib/dni';
import type { RolSistema } from '@/types/database.types';

type PersonaEncontrada = { id: string; apellido: string; nombre: string };

export function AltaPersonalPage() {
  const { hospitalActual } = useAuth();
  const [dni, setDni] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<PersonaEncontrada | 'no-encontrada' | null>(null);
  const [rol, setRol] = useState<RolSistema>('enfermeria');
  const [profesion, setProfesion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  async function buscar() {
    setBuscando(true);
    setResultado(null);
    setMensaje(null);
    const { data, error } = await supabase.rpc('buscar_persona_por_dni', { p_dni: dni.trim() });
    setBuscando(false);

    if (error) {
      setMensaje('No se pudo buscar: ' + error.message);
      setMensajeEsError(true);
      return;
    }
    setResultado(data && data.length > 0 ? data[0] : 'no-encontrada');
  }

  async function darDeAlta() {
    if (!hospitalActual || !resultado || resultado === 'no-encontrada') return;
    setGuardando(true);
    setMensaje(null);

    const { error } = await supabase.rpc('alta_persona_en_hospital', {
      p_persona_id: resultado.id,
      p_hospital_id: hospitalActual.id,
      p_rol: rol,
      p_profesion_funcion: profesion,
    });

    setGuardando(false);
    if (error) {
      setMensaje('No se pudo dar de alta: ' + error.message);
      setMensajeEsError(true);
      return;
    }

    setMensaje(`${resultado.apellido}, ${resultado.nombre} fue dado de alta en ${hospitalActual.nombre}.`);
    setMensajeEsError(false);
    setResultado(null);
    setDni('');
    setProfesion('');
  }

  return (
    <div className="max-w-md space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">Dar de alta personal</h1>
        <p className="text-sm text-superficie-400">
          Se va a dar de alta en <span className="font-medium">{hospitalActual?.nombre}</span>.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="dni-buscar" className="text-sm text-superficie-600">DNI</label>
        <div className="flex gap-2">
          <input
            id="dni-buscar"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            inputMode="numeric"
            placeholder="Sin puntos ni espacios"
            className="min-h-touch flex-1 rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
          />
          <button
            type="button"
            onClick={buscar}
            disabled={!dni.trim() || buscando}
            className="min-h-touch rounded-md bg-institucional-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {resultado === 'no-encontrada' && (
        <div className="rounded-card border border-limpieza-500 bg-limpieza-100 p-4 text-sm text-limpieza-700">
          No existe todavía una cuenta con ese DNI. Por ahora, un superusuario tiene que crearla a
          mano en Supabase (Authentication → Users) con el email{' '}
          <code className="rounded bg-superficie-0 px-1 font-mono text-xs">{dniToEmail(dni)}</code>,
          y después volver a buscar este DNI acá.
        </div>
      )}

      {resultado && resultado !== 'no-encontrada' && (
        <div className="space-y-4 rounded-card border border-superficie-200 bg-superficie-0 p-4 shadow-card">
          <div>
            <p className="text-xs text-superficie-400">Persona encontrada</p>
            <p className="font-medium text-superficie-900">
              {resultado.apellido}, {resultado.nombre}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="rol" className="text-sm text-superficie-600">Rol</label>
            <select
              id="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolSistema)}
              className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm"
            >
              <option value="enfermeria">Enfermería</option>
              <option value="medico">Médico</option>
              <option value="administracion">Administración</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="profesion" className="text-sm text-superficie-600">Profesión / función</label>
            <input
              id="profesion"
              value={profesion}
              onChange={(e) => setProfesion(e.target.value)}
              placeholder="Ej: Enfermera, Traumatólogo, Directora"
              className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={darDeAlta}
            disabled={!profesion.trim() || guardando}
            className="min-h-touch w-full rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Dar de alta'}
          </button>
        </div>
      )}

      {mensaje && (
        <p className={`text-sm ${mensajeEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>{mensaje}</p>
      )}
    </div>
  );
}
