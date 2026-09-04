import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Novedad } from '@/types/database.types';

export function NovedadesPage() {
  const { hospitalActual, persona } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);

  const [mensajeNuevo, setMensajeNuevo] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoEsError, setAvisoEsError] = useState(false);

  async function cargar() {
    if (!hospitalActual) return;
    setLoading(true);
    const { data } = await supabase
      .from('novedades')
      .select('*')
      .eq('hospital_id', hospitalActual.id)
      .order('created_at', { ascending: false });
    setNovedades(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalActual?.id]);

  async function handlePublicar(e: FormEvent) {
    e.preventDefault();
    if (!hospitalActual || !persona || !mensajeNuevo.trim()) return;
    setPublicando(true);
    setAviso(null);

    const { error } = await supabase.from('novedades').insert({
      hospital_id: hospitalActual.id,
      autor_id: persona.id,
      mensaje: mensajeNuevo.trim(),
      activa: true,
    });

    setPublicando(false);

    if (error) {
      setAviso('No se pudo publicar: ' + error.message);
      setAvisoEsError(true);
      return;
    }

    setMensajeNuevo('');
    setAviso('Novedad publicada — les va a aparecer a todos la próxima vez que entren.');
    setAvisoEsError(false);
    cargar();
  }

  async function alternarActiva(n: Novedad) {
    setProcesandoId(n.id);
    setAviso(null);

    const { error } = await supabase
      .from('novedades')
      .update({ activa: !n.activa })
      .eq('id', n.id);

    setProcesandoId(null);

    if (error) {
      setAviso('No se pudo actualizar: ' + error.message);
      setAvisoEsError(true);
      return;
    }

    cargar();
  }

  function formatearFecha(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">Novedades</h1>
        <p className="text-sm text-superficie-400">{hospitalActual?.nombre}</p>
      </div>

      <section className="space-y-3 rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-superficie-900">Publicar novedad</h2>
        <form onSubmit={handlePublicar} className="space-y-3">
          <textarea
            value={mensajeNuevo}
            onChange={(e) => setMensajeNuevo(e.target.value)}
            rows={3}
            placeholder="Ej: Se suspende el ingreso por guardia el sábado por mantenimiento eléctrico."
            className="w-full rounded-md border border-superficie-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
          />
          <button
            type="submit"
            disabled={!mensajeNuevo.trim() || publicando}
            className="min-h-touch w-full rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        </form>
      </section>

      {aviso && (
        <p className={`text-sm ${avisoEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>{aviso}</p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-superficie-900">Publicadas</h2>

        {loading && <p className="text-sm text-superficie-400">Cargando…</p>}
        {!loading && novedades.length === 0 && (
          <p className="text-sm text-superficie-400">Todavía no publicaste ninguna novedad.</p>
        )}

        {novedades.map((n) => (
          <div
            key={n.id}
            className={`space-y-2 rounded-card border bg-superficie-0 p-4 shadow-card ${
              n.activa ? 'border-superficie-200' : 'border-superficie-200 opacity-60'
            }`}
          >
            <p className="text-sm text-superficie-900">{n.mensaje}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-superficie-400">{formatearFecha(n.created_at)}</p>
              <button
                type="button"
                onClick={() => alternarActiva(n)}
                disabled={procesandoId === n.id}
                className="text-xs text-institucional-600 underline underline-offset-2 disabled:opacity-50"
              >
                {n.activa ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
