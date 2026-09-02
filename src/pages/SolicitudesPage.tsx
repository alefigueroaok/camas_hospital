import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSolicitudesDerivacion, type SolicitudConDetalle } from '@/hooks/useSolicitudesDerivacion';
import type { EstadoSolicitud } from '@/types/database.types';

const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

export function SolicitudesPage() {
  const { hospitalActual } = useAuth();
  const { entrantes, enviadas, loading } = useSolicitudesDerivacion(hospitalActual?.id);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  async function aceptar(solicitud: SolicitudConDetalle) {
    setProcesandoId(solicitud.id);
    setMensaje(null);
    const { error } = await supabase.rpc('aceptar_solicitud_derivacion', {
      p_solicitud_id: solicitud.id,
    });
    setProcesandoId(null);
    if (error) {
      setMensaje('No se pudo aceptar: ' + error.message);
      setMensajeEsError(true);
      return;
    }
    setMensaje(`Aceptado — la cama ${solicitud.cama.numero_cama} ya quedó ocupada.`);
    setMensajeEsError(false);
  }

  async function rechazar(solicitud: SolicitudConDetalle) {
    if (!window.confirm('¿Rechazar este pedido?')) return;
    setProcesandoId(solicitud.id);
    setMensaje(null);
    const { error } = await supabase.rpc('rechazar_solicitud_derivacion', {
      p_solicitud_id: solicitud.id,
    });
    setProcesandoId(null);
    if (error) {
      setMensaje('No se pudo rechazar: ' + error.message);
      setMensajeEsError(true);
      return;
    }
    setMensaje('Pedido rechazado.');
    setMensajeEsError(false);
  }

  if (loading) return <p className="p-6 text-sm text-superficie-400">Cargando…</p>;

  const pendientesEntrantes = entrantes.filter((s) => s.estado === 'pendiente');

  return (
    <div className="max-w-2xl space-y-8 p-6">
      <h1 className="font-display text-2xl font-semibold text-superficie-900">Solicitudes de derivación</h1>

      {mensaje && (
        <p className={`text-sm ${mensajeEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>{mensaje}</p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-superficie-900">
          Pedidos que te llegaron
          {pendientesEntrantes.length > 0 && (
            <span className="ml-2 rounded-full bg-ocupada-100 px-2 py-0.5 text-xs font-medium text-ocupada-700">
              {pendientesEntrantes.length} pendiente{pendientesEntrantes.length === 1 ? '' : 's'}
            </span>
          )}
        </h2>

        {entrantes.length === 0 && <p className="text-sm text-superficie-400">No hay pedidos entrantes.</p>}

        {entrantes.map((s) => (
          <div
            key={s.id}
            className="space-y-2 rounded-card border border-superficie-200 bg-superficie-0 p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-superficie-900">{s.paciente.apellido_nombre}</p>
              <span className="text-xs font-medium text-superficie-400">{ETIQUETA_ESTADO[s.estado]}</span>
            </div>
            <p className="text-sm text-superficie-600">{s.diagnostico}</p>
            <p className="text-xs text-superficie-400">
              Desde {s.hospitalOrigen.nombre} — cama {s.cama.numero_cama}
            </p>
            {s.estado === 'pendiente' && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => aceptar(s)}
                  disabled={procesandoId === s.id}
                  className="min-h-touch flex-1 rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {procesandoId === s.id ? 'Procesando…' : 'Aceptar'}
                </button>
                <button
                  type="button"
                  onClick={() => rechazar(s)}
                  disabled={procesandoId === s.id}
                  className="min-h-touch flex-1 rounded-md border border-ocupada-500 text-sm font-semibold text-ocupada-700 disabled:opacity-60"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-superficie-900">Tus pedidos enviados</h2>

        {enviadas.length === 0 && (
          <p className="text-sm text-superficie-400">No enviaste ningún pedido todavía.</p>
        )}

        {enviadas.map((s) => (
          <div
            key={s.id}
            className="space-y-1 rounded-card border border-superficie-200 bg-superficie-0 p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-superficie-900">{s.paciente.apellido_nombre}</p>
              <span
                className={`text-xs font-medium ${
                  s.estado === 'aceptada'
                    ? 'text-disponible-700'
                    : s.estado === 'rechazada'
                      ? 'text-ocupada-700'
                      : 'text-superficie-400'
                }`}
              >
                {ETIQUETA_ESTADO[s.estado]}
              </span>
            </div>
            <p className="text-sm text-superficie-600">
              Hacia {s.hospitalDestino.nombre} — cama {s.cama.numero_cama}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
