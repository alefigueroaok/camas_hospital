import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ESTADOS_CAMA } from '@/constants/estadoCama';
import { FormularioPaciente, type DatosPaciente } from './FormularioPaciente';
import type { Cama } from '@/types/database.types';
import type { OcupacionConPaciente } from '@/hooks/useCamasDelHospital';

interface Props {
  cama: Cama;
  sectorNombre?: string;
  ocupacion?: OcupacionConPaciente;
}

type Modo = 'ver' | 'ocupar' | 'editar';

export function CamaCardMobile({ cama, sectorNombre, ocupacion }: Props) {
  const [modo, setModo] = useState<Modo>('ver');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = ESTADOS_CAMA[cama.estado];

  async function handleOcupar(datos: DatosPaciente) {
    setProcesando(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('ocupar_cama', {
      p_cama_id: cama.id,
      p_apellido_nombre: datos.apellidoNombre,
      p_diagnostico: datos.diagnostico,
      p_dni: datos.dni || undefined,
      p_domicilio: datos.domicilio || undefined,
      p_telefono: datos.telefono || undefined,
    });
    setProcesando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setModo('ver');
    // El Realtime de camas se encarga de refrescar la tarjeta solo.
  }

  async function handleEditar(datos: DatosPaciente) {
    setProcesando(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('editar_ocupacion', {
      p_cama_id: cama.id,
      p_apellido_nombre: datos.apellidoNombre,
      p_diagnostico: datos.diagnostico,
      p_dni: datos.dni || undefined,
      p_domicilio: datos.domicilio || undefined,
      p_telefono: datos.telefono || undefined,
    });
    setProcesando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setModo('ver');
  }

  async function handleLiberar() {
    if (!window.confirm(`¿Liberar la cama ${cama.numero_cama}?`)) return;
    setProcesando(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('liberar_cama', { p_cama_id: cama.id });
    setProcesando(false);
    if (rpcError) setError(rpcError.message);
  }

  return (
    <article className="relative overflow-hidden rounded-card border border-superficie-200 bg-superficie-0 shadow-card">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${meta.solid500}`} aria-hidden />

      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-superficie-400">
            {sectorNombre ?? 'Sector'}
          </p>
          <p className="font-mono text-2xl font-semibold text-superficie-900">
            Cama {cama.numero_cama}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${meta.bg100} ${meta.text700}`}
        >
          {meta.label}
        </span>
      </div>

      {ocupacion && modo !== 'editar' && (
        <div className="px-5 pt-3 text-sm">
          <p className="font-medium text-superficie-900">{ocupacion.paciente.apellido_nombre}</p>
          <p className="text-superficie-600">{ocupacion.diagnostico}</p>
        </div>
      )}

      {error && <p className="px-5 pt-2 text-xs text-ocupada-700">{error}</p>}

      {modo === 'ver' && (
        <div className="flex gap-2 p-4">
          {cama.estado === 'libre' && (
            <button
              type="button"
              onClick={() => setModo('ocupar')}
              className="min-h-touch flex-1 rounded-lg bg-institucional-600 text-sm font-semibold text-white"
            >
              Ocupar
            </button>
          )}

          {cama.estado === 'ocupada' && (
            <>
              <button
                type="button"
                onClick={() => setModo('editar')}
                className="min-h-touch flex-1 rounded-lg border border-superficie-200 text-sm font-medium text-superficie-600"
              >
                ✏️ Editar
              </button>
              <button
                type="button"
                onClick={handleLiberar}
                disabled={procesando}
                className="min-h-touch flex-1 rounded-lg border border-disponible-500 text-sm font-semibold text-disponible-700 disabled:opacity-60"
              >
                {procesando ? 'Liberando…' : 'Liberar'}
              </button>
            </>
          )}

          {cama.estado === 'reservada' && (
            <p className="py-2 text-xs text-superficie-400">
              Reservada — la derivación entre hospitales se conecta en una fase aparte.
            </p>
          )}
        </div>
      )}

      {(modo === 'ocupar' || modo === 'editar') && (
        <div className="p-4">
          <FormularioPaciente
            valoresIniciales={
              modo === 'editar' && ocupacion
                ? {
                    apellidoNombre: ocupacion.paciente.apellido_nombre,
                    diagnostico: ocupacion.diagnostico,
                    dni: ocupacion.paciente.dni ?? '',
                    domicilio: ocupacion.paciente.domicilio ?? '',
                    telefono: ocupacion.paciente.telefono ?? '',
                  }
                : undefined
            }
            enviando={procesando}
            textoBoton={modo === 'ocupar' ? 'Ocupar cama' : 'Guardar cambios'}
            onCancelar={() => setModo('ver')}
            onEnviar={modo === 'ocupar' ? handleOcupar : handleEditar}
          />
        </div>
      )}
    </article>
  );
}
