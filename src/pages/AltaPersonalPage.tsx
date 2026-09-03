import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { HospitalUsuario, Persona, RolSistema } from '@/types/database.types';

interface PersonalConDetalle extends HospitalUsuario {
  persona: Persona;
}

export function PersonalPage() {
  const { hospitalActual } = useAuth();
  const [personal, setPersonal] = useState<PersonalConDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<{ rol: RolSistema; profesion: string }>({
    rol: 'enfermeria',
    profesion: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  function mostrarMensaje(texto: string, esError: boolean) {
    setMensaje(texto);
    setMensajeEsError(esError);
  }

  async function cargar() {
    if (!hospitalActual) return;
    setLoading(true);

    const { data: filas } = await supabase
      .from('hospital_usuarios')
      .select('*')
      .eq('hospital_id', hospitalActual.id)
      .order('created_at');

    const lista = filas ?? [];
    const personaIds = [...new Set(lista.map((f) => f.persona_id))];

    const { data: personasData } = personaIds.length
      ? await supabase.from('personas').select('*').in('id', personaIds)
      : { data: [] as Persona[] };

    const personasPorId = new Map((personasData ?? []).map((p) => [p.id, p]));

    const enriquecido: PersonalConDetalle[] = [];
    for (const f of lista) {
      const persona = personasPorId.get(f.persona_id);
      if (!persona) continue;
      enriquecido.push({ ...f, persona });
    }

    // Activos primero, después por apellido.
    enriquecido.sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1;
      return a.persona.apellido.localeCompare(b.persona.apellido, 'es');
    });

    setPersonal(enriquecido);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalActual?.id]);

  function iniciarEdicion(fila: PersonalConDetalle) {
    setEditandoId(fila.id);
    setEdicion({ rol: fila.rol, profesion: fila.profesion_funcion });
  }

  async function guardarEdicion(fila: PersonalConDetalle) {
    if (!edicion.profesion.trim()) {
      mostrarMensaje('La profesión/función no puede quedar vacía.', true);
      return;
    }
    setGuardando(true);
    setMensaje(null);

    const { error } = await supabase
      .from('hospital_usuarios')
      .update({ rol: edicion.rol, profesion_funcion: edicion.profesion.trim() })
      .eq('id', fila.id);

    setGuardando(false);

    if (error) {
      mostrarMensaje('No se pudo guardar: ' + error.message, true);
      return;
    }

    setEditandoId(null);
    mostrarMensaje(`${fila.persona.apellido}, ${fila.persona.nombre} actualizado.`, false);
    cargar();
  }

  async function alternarActivo(fila: PersonalConDetalle) {
    setProcesandoId(fila.id);
    setMensaje(null);

    const { error } = await supabase
      .from('hospital_usuarios')
      .update({ activo: !fila.activo })
      .eq('id', fila.id);

    setProcesandoId(null);

    if (error) {
      mostrarMensaje('No se pudo actualizar: ' + error.message, true);
      return;
    }

    mostrarMensaje(
      fila.activo
        ? `${fila.persona.apellido} fue dado de baja de este hospital.`
        : `${fila.persona.apellido} fue reactivado en este hospital.`,
      false
    );
    cargar();
  }

  async function eliminar(fila: PersonalConDetalle) {
    if (
      !window.confirm(
        `¿Eliminar a ${fila.persona.apellido}, ${fila.persona.nombre} de este hospital? ` +
          'Esto borra el registro por completo (a diferencia de "Dar de baja", no queda rastro). No se puede deshacer.'
      )
    )
      return;

    setProcesandoId(fila.id);
    setMensaje(null);

    const { error } = await supabase.from('hospital_usuarios').delete().eq('id', fila.id);

    setProcesandoId(null);

    if (error) {
      mostrarMensaje('No se pudo eliminar: ' + error.message, true);
      return;
    }

    mostrarMensaje(`${fila.persona.apellido}, ${fila.persona.nombre} eliminado de este hospital.`, false);
    cargar();
  }

  const ETIQUETA_ROL: Record<RolSistema, string> = {
    enfermeria: 'Enfermería',
    medico: 'Médico',
    administracion: 'Administración',
  };

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">Personal</h1>
        <p className="text-sm text-superficie-400">{hospitalActual?.nombre}</p>
      </div>

      {mensaje && (
        <div
          className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-card border p-4 text-sm shadow-card ${
            mensajeEsError
              ? 'border-ocupada-500 bg-ocupada-100 text-ocupada-700'
              : 'border-disponible-500 bg-disponible-100 text-disponible-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p>{mensaje}</p>
            <button
              type="button"
              onClick={() => setMensaje(null)}
              className="shrink-0 text-current opacity-60 hover:opacity-100"
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-superficie-400">Cargando…</p>}

      {!loading && personal.length === 0 && (
        <p className="text-sm text-superficie-400">Todavía no hay nadie dado de alta en este hospital.</p>
      )}

      <div className="space-y-3">
        {personal.map((fila) => {
          const editando = editandoId === fila.id;
          return (
            <div
              key={fila.id}
              className={`space-y-3 rounded-card border bg-superficie-0 p-4 shadow-card ${
                fila.activo ? 'border-superficie-200' : 'border-superficie-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-superficie-900">
                    {fila.persona.apellido}, {fila.persona.nombre}
                  </p>
                  <p className="font-mono text-xs text-superficie-400">DNI {fila.persona.dni}</p>
                </div>
                {!fila.activo && (
                  <span className="rounded-full bg-superficie-100 px-2 py-0.5 text-xs font-medium text-superficie-400">
                    De baja
                  </span>
                )}
              </div>

              {editando ? (
                <div className="space-y-2 border-t border-superficie-200 pt-3">
                  <select
                    value={edicion.rol}
                    onChange={(e) => setEdicion((p) => ({ ...p, rol: e.target.value as RolSistema }))}
                    className="min-h-touch w-full rounded-md border border-institucional-500 px-3 text-sm"
                  >
                    <option value="enfermeria">Enfermería</option>
                    <option value="medico">Médico</option>
                    <option value="administracion">Administración</option>
                  </select>
                  <input
                    value={edicion.profesion}
                    onChange={(e) => setEdicion((p) => ({ ...p, profesion: e.target.value }))}
                    placeholder="Profesión / función"
                    className="min-h-touch w-full rounded-md border border-institucional-500 px-3 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => guardarEdicion(fila)}
                      disabled={guardando}
                      className="min-h-touch flex-1 rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoId(null)}
                      className="min-h-touch rounded-md border border-superficie-200 px-4 text-sm text-superficie-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-superficie-200 pt-3">
                  <span className="text-sm text-superficie-600">
                    {ETIQUETA_ROL[fila.rol]} · {fila.profesion_funcion}
                  </span>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => iniciarEdicion(fila)}
                      className="text-institucional-600 underline underline-offset-2"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarActivo(fila)}
                      disabled={procesandoId === fila.id}
                      className="text-institucional-600 underline underline-offset-2 disabled:opacity-50"
                    >
                      {fila.activo ? '⏸️ Dar de baja' : '▶️ Reactivar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(fila)}
                      disabled={procesandoId === fila.id}
                      className="text-ocupada-700 underline underline-offset-2 disabled:opacity-50"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
