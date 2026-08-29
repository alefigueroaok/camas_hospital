import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Hospital } from '@/types/database.types';

export function SuperusuarioPage() {
  const { persona, signOut } = useAuth();

  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  const [nombre, setNombre] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [directorNombre, setDirectorNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  async function cargarHospitales() {
    setCargandoLista(true);
    const { data, error } = await supabase.from('hospitales').select('*').order('nombre');
    if (!error) setHospitales(data ?? []);
    setCargandoLista(false);
  }

  useEffect(() => {
    cargarHospitales();
  }, []);

  function limpiarFormulario() {
    setNombre('');
    setDomicilio('');
    setDirectorNombre('');
    setTelefono('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setCreando(true);
    setMensaje(null);

    const { error } = await supabase.rpc('crear_hospital', {
      p_nombre: nombre.trim(),
      p_domicilio: domicilio.trim(),
      p_director_nombre: directorNombre.trim(),
      p_telefono: telefono.trim(),
    });

    setCreando(false);

    if (error) {
      setMensaje('No se pudo crear: ' + error.message);
      setMensajeEsError(true);
      return;
    }

    setMensaje(`Hospital "${nombre}" creado.`);
    setMensajeEsError(false);
    limpiarFormulario();
    cargarHospitales();
  }

  const formularioCompleto =
    nombre.trim() && domicilio.trim() && directorNombre.trim() && telefono.trim();

  return (
    <div className="min-h-screen space-y-8 bg-superficie-50 p-6">
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

      <section className="max-w-md space-y-4 rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-superficie-900">Crear hospital</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="nombre" className="text-sm text-superficie-600">Nombre</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Hospital Zonal de Fernández"
              className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="domicilio" className="text-sm text-superficie-600">Domicilio</label>
            <input
              id="domicilio"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="director" className="text-sm text-superficie-600">
              Apellido y nombre del director
            </label>
            <input
              id="director"
              value={directorNombre}
              onChange={(e) => setDirectorNombre(e.target.value)}
              className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="telefono" className="text-sm text-superficie-600">Teléfono</label>
            <input
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
            />
          </div>

          <button
            type="submit"
            disabled={!formularioCompleto || creando}
            className="min-h-touch w-full rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creando ? 'Creando…' : 'Crear hospital'}
          </button>
        </form>

        {mensaje && (
          <p className={`text-sm ${mensajeEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>{mensaje}</p>
        )}
      </section>

      <section className="max-w-2xl space-y-3">
        <h2 className="font-display text-lg font-semibold text-superficie-900">
          Hospitales existentes
        </h2>

        {cargandoLista && <p className="text-sm text-superficie-400">Cargando…</p>}

        {!cargandoLista && hospitales.length === 0 && (
          <p className="text-sm text-superficie-400">Todavía no hay ningún hospital creado.</p>
        )}

        {!cargandoLista && hospitales.length > 0 && (
          <div className="overflow-hidden rounded-card border border-superficie-200 bg-superficie-0 shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-superficie-100 text-xs uppercase tracking-wide text-superficie-400">
                <tr>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Domicilio</th>
                  <th className="px-4 py-2">Director</th>
                  <th className="px-4 py-2">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {hospitales.map((h) => (
                  <tr key={h.id} className="border-t border-superficie-200">
                    <td className="px-4 py-2 font-medium text-superficie-900">{h.nombre}</td>
                    <td className="px-4 py-2 text-superficie-600">{h.domicilio}</td>
                    <td className="px-4 py-2 text-superficie-600">{h.director_nombre}</td>
                    <td className="px-4 py-2 font-mono text-xs text-superficie-600">{h.telefono}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="max-w-2xl text-xs text-superficie-400">
        Nota: para dar de alta al primer administrador de un hospital nuevo todavía hay que
        hacerlo por SQL (la pantalla "Dar de alta personal" necesita un hospital seleccionado, y
        vos como superusuario nunca seleccionás uno). Es un hueco conocido, no una funcionalidad
        rota — se resuelve en la próxima fase agregando un selector de hospital acá mismo.
      </p>
    </div>
  );
}
