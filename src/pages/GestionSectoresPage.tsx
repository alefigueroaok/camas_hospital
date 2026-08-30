import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADOS_CAMA } from '@/constants/estadoCama';
import type { Cama, Sector } from '@/types/database.types';

export function GestionSectoresPage() {
  const { hospitalActual } = useAuth();

  const [sectores, setSectores] = useState<Sector[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nombreSector, setNombreSector] = useState('');
  const [creandoSector, setCreandoSector] = useState(false);

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  // Formulario de alta de camas: un estado por sector, para poder tener
  // varios abiertos a la vez sin que se pisen entre sí.
  const [cantidadPorSector, setCantidadPorSector] = useState<Record<string, string>>({});
  const [agregandoEnSector, setAgregandoEnSector] = useState<string | null>(null);

  async function cargarTodo() {
    if (!hospitalActual) return;
    setCargando(true);

    const [{ data: sectoresData }, { data: camasData }] = await Promise.all([
      supabase.from('sectores').select('*').eq('hospital_id', hospitalActual.id).order('nombre'),
      supabase.from('camas').select('*').eq('hospital_id', hospitalActual.id).order('numero_cama'),
    ]);

    setSectores(sectoresData ?? []);
    setCamas(camasData ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalActual?.id]);

  const camasPorSector = useMemo(() => {
    const mapa = new Map<string, Cama[]>();
    for (const cama of camas) {
      const lista = mapa.get(cama.sector_id) ?? [];
      lista.push(cama);
      mapa.set(cama.sector_id, lista);
    }
    return mapa;
  }, [camas]);

  async function handleCrearSector(e: FormEvent) {
    e.preventDefault();
    if (!hospitalActual || !nombreSector.trim()) return;
    setCreandoSector(true);
    setMensaje(null);

    const { error } = await supabase
      .from('sectores')
      .insert({ hospital_id: hospitalActual.id, nombre: nombreSector.trim() });

    setCreandoSector(false);

    if (error) {
      setMensaje('No se pudo crear el sector: ' + error.message);
      setMensajeEsError(true);
      return;
    }

    setNombreSector('');
    cargarTodo();
  }

  async function handleAgregarCamas(sector: Sector) {
    if (!hospitalActual) return;
    const cantidadTexto = cantidadPorSector[sector.id] ?? '';
    const cantidad = parseInt(cantidadTexto, 10);

    if (!Number.isFinite(cantidad) || cantidad < 1) {
      setMensaje('Poné una cantidad válida (1 o más).');
      setMensajeEsError(true);
      return;
    }

    setAgregandoEnSector(sector.id);
    setMensaje(null);

    // Numeración automática: sigue después del número más alto que ya
    // exista en ESTE sector (ignorando números de cama no numéricos).
    // El número de cama es único por HOSPITAL (no por sector) en la base
    // de datos, así que la numeración automática tiene que evitar
    // choques con camas de cualquier sector, no sólo con las de este.
    const maxActual = camas.reduce((max, c) => {
      const n = parseInt(c.numero_cama, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    const nuevasCamas = Array.from({ length: cantidad }, (_, i) => ({
      hospital_id: hospitalActual.id,
      sector_id: sector.id,
      numero_cama: String(maxActual + i + 1),
    }));

    const { error } = await supabase.from('camas').insert(nuevasCamas);

    setAgregandoEnSector(null);

    if (error) {
      setMensaje('No se pudieron agregar las camas: ' + error.message);
      setMensajeEsError(true);
      return;
    }

    setCantidadPorSector((prev) => ({ ...prev, [sector.id]: '' }));
    setMensaje(`Se agregaron ${cantidad} cama(s) a ${sector.nombre}.`);
    setMensajeEsError(false);
    cargarTodo();
  }

  if (cargando) {
    return <p className="p-6 text-sm text-superficie-400">Cargando…</p>;
  }

  return (
    <div className="max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">
          Sectores y camas
        </h1>
        <p className="text-sm text-superficie-400">{hospitalActual?.nombre}</p>
      </div>

      <section className="space-y-3 rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-superficie-900">Nuevo sector</h2>
        <form onSubmit={handleCrearSector} className="flex gap-2">
          <input
            value={nombreSector}
            onChange={(e) => setNombreSector(e.target.value)}
            placeholder="Ej: Guardia, Maternidad, Terapia"
            className="min-h-touch flex-1 rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
          />
          <button
            type="submit"
            disabled={!nombreSector.trim() || creandoSector}
            className="min-h-touch rounded-md bg-institucional-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creandoSector ? 'Creando…' : 'Crear sector'}
          </button>
        </form>
      </section>

      {mensaje && (
        <p className={`text-sm ${mensajeEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>{mensaje}</p>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-superficie-900">
          Sectores existentes
        </h2>

        {sectores.length === 0 && (
          <p className="text-sm text-superficie-400">Todavía no hay ningún sector creado.</p>
        )}

        {sectores.map((sector) => {
          const camasDelSector = camasPorSector.get(sector.id) ?? [];
          return (
            <div
              key={sector.id}
              className="space-y-3 rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-superficie-900">
                  {sector.nombre}
                </h3>
                <span className="text-xs text-superficie-400">
                  {camasDelSector.length} cama{camasDelSector.length === 1 ? '' : 's'}
                </span>
              </div>

              {camasDelSector.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {camasDelSector.map((cama) => {
                    const meta = ESTADOS_CAMA[cama.estado];
                    return (
                      <span
                        key={cama.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.bg100} ${meta.text700}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.solid500}`} aria-hidden />
                        {cama.numero_cama}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-superficie-200 pt-3">
                <input
                  type="number"
                  min={1}
                  value={cantidadPorSector[sector.id] ?? ''}
                  onChange={(e) =>
                    setCantidadPorSector((prev) => ({ ...prev, [sector.id]: e.target.value }))
                  }
                  placeholder="Cantidad"
                  className="min-h-touch w-28 rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
                />
                <button
                  type="button"
                  onClick={() => handleAgregarCamas(sector)}
                  disabled={agregandoEnSector === sector.id}
                  className="min-h-touch rounded-md border border-institucional-600 px-3 text-sm font-semibold text-institucional-600 disabled:opacity-60"
                >
                  {agregandoEnSector === sector.id ? 'Agregando…' : '+ Agregar camas'}
                </button>
                <span className="text-xs text-superficie-400">
                  Se numeran solas, siguiendo a la última de este sector.
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
