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

  // Edición de nombre de sector.
  const [sectorEditandoId, setSectorEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [eliminandoSectorId, setEliminandoSectorId] = useState<string | null>(null);
  const [eliminandoCamaId, setEliminandoCamaId] = useState<string | null>(null);

  function mostrarMensaje(texto: string, esError: boolean) {
    setMensaje(texto);
    setMensajeEsError(esError);
  }

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
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.numero_cama.localeCompare(b.numero_cama, 'es', { numeric: true }));
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
      mostrarMensaje('No se pudo crear el sector: ' + error.message, true);
      return;
    }

    setNombreSector('');
    cargarTodo();
  }

  async function handleAgregarCamas(sector: Sector) {
    const cantidadTexto = cantidadPorSector[sector.id] ?? '';
    const cantidad = parseInt(cantidadTexto, 10);

    if (!Number.isFinite(cantidad) || cantidad < 1) {
      mostrarMensaje('Poné una cantidad válida (1 o más).', true);
      return;
    }

    setAgregandoEnSector(sector.id);
    setMensaje(null);

    // La numeración se calcula DENTRO de la base de datos (RPC
    // agregar_camas_a_sector, única POR SECTOR), no acá.
    const { error } = await supabase.rpc('agregar_camas_a_sector', {
      p_sector_id: sector.id,
      p_cantidad: cantidad,
    });

    setAgregandoEnSector(null);

    if (error) {
      mostrarMensaje('No se pudieron agregar las camas: ' + error.message, true);
      return;
    }

    setCantidadPorSector((prev) => ({ ...prev, [sector.id]: '' }));
    mostrarMensaje(`Se agregaron ${cantidad} cama(s) a ${sector.nombre}.`, false);
    cargarTodo();
  }

  function iniciarEdicionNombre(sector: Sector) {
    setSectorEditandoId(sector.id);
    setNombreEditado(sector.nombre);
  }

  function cancelarEdicionNombre() {
    setSectorEditandoId(null);
    setNombreEditado('');
  }

  async function guardarNombreSector(sector: Sector) {
    if (!nombreEditado.trim()) return;
    setGuardandoNombre(true);
    setMensaje(null);

    const { error } = await supabase
      .from('sectores')
      .update({ nombre: nombreEditado.trim() })
      .eq('id', sector.id);

    setGuardandoNombre(false);

    if (error) {
      mostrarMensaje('No se pudo renombrar: ' + error.message, true);
      return;
    }

    setSectorEditandoId(null);
    mostrarMensaje(`Sector renombrado a "${nombreEditado.trim()}".`, false);
    cargarTodo();
  }

  async function eliminarSector(sector: Sector) {
    const camasDelSector = camasPorSector.get(sector.id) ?? [];
    if (camasDelSector.length > 0) {
      mostrarMensaje('Este sector todavía tiene camas — borralas primero.', true);
      return;
    }
    if (!window.confirm(`¿Eliminar el sector "${sector.nombre}"? No se puede deshacer.`)) return;

    setEliminandoSectorId(sector.id);
    setMensaje(null);

    const { error } = await supabase.from('sectores').delete().eq('id', sector.id);

    setEliminandoSectorId(null);

    if (error) {
      mostrarMensaje('No se pudo eliminar el sector: ' + error.message, true);
      return;
    }

    mostrarMensaje(`Sector "${sector.nombre}" eliminado.`, false);
    cargarTodo();
  }

  async function eliminarCama(cama: Cama) {
    if (!window.confirm(`¿Eliminar la cama ${cama.numero_cama}?`)) return;

    setEliminandoCamaId(cama.id);
    setMensaje(null);

    const { error } = await supabase.from('camas').delete().eq('id', cama.id);

    setEliminandoCamaId(null);

    if (error) {
      // La base bloquea el borrado si la cama tiene historial de ocupaciones
      // (para no perder datos) — se lo mostramos tal cual en vez de un
      // mensaje genérico, porque la razón real le sirve al administrador.
      mostrarMensaje('No se pudo eliminar la cama ' + cama.numero_cama + ': ' + error.message, true);
      return;
    }

    mostrarMensaje(`Cama ${cama.numero_cama} eliminada.`, false);
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
          const editandoEsteNombre = sectorEditandoId === sector.id;

          return (
            <div
              key={sector.id}
              className="space-y-3 rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                {editandoEsteNombre ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      autoFocus
                      className="min-h-touch flex-1 rounded-md border border-institucional-500 px-3 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => guardarNombreSector(sector)}
                      disabled={!nombreEditado.trim() || guardandoNombre}
                      className="min-h-touch rounded-md bg-institucional-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {guardandoNombre ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicionNombre}
                      className="min-h-touch rounded-md border border-superficie-200 px-3 text-xs text-superficie-600"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-display text-base font-semibold text-superficie-900">
                      {sector.nombre}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-superficie-400">
                        {camasDelSector.length} cama{camasDelSector.length === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarEdicionNombre(sector)}
                        title="Renombrar sector"
                        className="text-xs text-institucional-600 underline underline-offset-2"
                      >
                        ✏️ Renombrar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarSector(sector)}
                        disabled={camasDelSector.length > 0 || eliminandoSectorId === sector.id}
                        title={
                          camasDelSector.length > 0
                            ? 'Borrá primero todas las camas de este sector'
                            : 'Eliminar sector'
                        }
                        className="text-xs text-ocupada-700 underline underline-offset-2 disabled:cursor-not-allowed disabled:text-superficie-300 disabled:no-underline"
                      >
                        {eliminandoSectorId === sector.id ? 'Eliminando…' : '🗑️ Eliminar'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {camasDelSector.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {camasDelSector.map((cama) => {
                    const meta = ESTADOS_CAMA[cama.estado];
                    return (
                      <span
                        key={cama.id}
                        className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-medium ${meta.bg100} ${meta.text700}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.solid500}`} aria-hidden />
                        {cama.numero_cama}
                        <button
                          type="button"
                          onClick={() => eliminarCama(cama)}
                          disabled={eliminandoCamaId === cama.id}
                          title="Eliminar esta cama"
                          className="ml-0.5 rounded-full px-1 text-superficie-400 hover:bg-superficie-0 hover:text-ocupada-700 disabled:opacity-50"
                        >
                          ×
                        </button>
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
