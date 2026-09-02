import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FormularioPaciente, type DatosPaciente } from '@/components/camas/FormularioPaciente';
import type { Cama, Hospital, Sector } from '@/types/database.types';

export function DerivarPacientePage() {
  const { hospitalActual } = useAuth();

  const [hospitales, setHospitales] = useState<Hospital[]>([]);
  const [hospitalDestinoId, setHospitalDestinoId] = useState('');
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [camas, setCamas] = useState<Cama[]>([]);
  const [cargandoCamas, setCargandoCamas] = useState(false);
  const [camaSeleccionada, setCamaSeleccionada] = useState<Cama | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeEsError, setMensajeEsError] = useState(false);

  useEffect(() => {
    supabase
      .from('hospitales')
      .select('*')
      .order('nombre')
      .then(({ data }) => setHospitales(data ?? []));
  }, []);

  async function cargarCamasLibres(destinoId: string) {
    setCargandoCamas(true);
    const [{ data: sectoresData }, { data: camasData }] = await Promise.all([
      supabase.from('sectores').select('*').eq('hospital_id', destinoId).order('nombre'),
      supabase
        .from('camas')
        .select('*')
        .eq('hospital_id', destinoId)
        .eq('estado', 'libre')
        .order('numero_cama'),
    ]);
    setSectores(sectoresData ?? []);
    setCamas(camasData ?? []);
    setCargandoCamas(false);
  }

  useEffect(() => {
    setCamaSeleccionada(null);
    setMensaje(null);
    if (!hospitalDestinoId) {
      setSectores([]);
      setCamas([]);
      return;
    }
    cargarCamasLibres(hospitalDestinoId);
  }, [hospitalDestinoId]);

  const camasPorSector = useMemo(() => {
    const mapa = new Map<string, Cama[]>();
    for (const c of camas) {
      const lista = mapa.get(c.sector_id) ?? [];
      lista.push(c);
      mapa.set(c.sector_id, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.numero_cama.localeCompare(b.numero_cama, 'es', { numeric: true }));
    }
    return mapa;
  }, [camas]);

  const nombreSector = (id: string) => sectores.find((s) => s.id === id)?.nombre;

  async function handleEnviar(datos: DatosPaciente) {
    if (!hospitalActual || !camaSeleccionada) return;
    setEnviando(true);
    setMensaje(null);

    const { error } = await supabase.rpc('solicitar_reserva_derivacion', {
      p_cama_id: camaSeleccionada.id,
      p_hospital_origen_id: hospitalActual.id,
      p_apellido_nombre: datos.apellidoNombre,
      p_diagnostico: datos.diagnostico,
      p_dni: datos.dni || undefined,
      p_domicilio: datos.domicilio || undefined,
      p_telefono: datos.telefono || undefined,
    });

    setEnviando(false);

    if (error) {
      setMensaje('No se pudo enviar el pedido: ' + error.message);
      setMensajeEsError(true);
      return;
    }

    setMensaje(`Pedido de reserva enviado para la cama ${camaSeleccionada.numero_cama}.`);
    setMensajeEsError(false);
    setCamaSeleccionada(null);
    cargarCamasLibres(hospitalDestinoId); // esa cama ya no está libre
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">Derivar paciente</h1>
        <p className="text-sm text-superficie-400">
          Buscá una cama libre en otro hospital (o en el tuyo) para reservarla.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="hospital-destino" className="text-sm text-superficie-600">
          Hospital destino
        </label>
        <select
          id="hospital-destino"
          value={hospitalDestinoId}
          onChange={(e) => setHospitalDestinoId(e.target.value)}
          className="min-h-touch w-full max-w-sm rounded-md border border-superficie-200 bg-superficie-0 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
        >
          <option value="">Elegí un hospital…</option>
          {hospitales.map((h) => (
            <option key={h.id} value={h.id}>
              {h.nombre}
              {h.id === hospitalActual?.id ? ' (el tuyo)' : ''}
            </option>
          ))}
        </select>
      </div>

      {mensaje && (
        <p className={`text-sm ${mensajeEsError ? 'text-ocupada-700' : 'text-disponible-700'}`}>{mensaje}</p>
      )}

      {cargandoCamas && <p className="text-sm text-superficie-400">Buscando camas libres…</p>}

      {!cargandoCamas && hospitalDestinoId && camas.length === 0 && (
        <p className="text-sm text-superficie-400">No hay camas libres en ese hospital ahora mismo.</p>
      )}

      {!cargandoCamas && sectores.length > 0 && camas.length > 0 && (
        <div className="space-y-4">
          {sectores.map((sector) => {
            const camasDelSector = camasPorSector.get(sector.id) ?? [];
            if (camasDelSector.length === 0) return null;
            return (
              <div key={sector.id} className="space-y-2">
                <h3 className="font-display text-sm font-semibold text-superficie-900">{sector.nombre}</h3>
                <div className="flex flex-wrap gap-2">
                  {camasDelSector.map((cama) => (
                    <button
                      key={cama.id}
                      type="button"
                      onClick={() => setCamaSeleccionada(cama)}
                      className={`min-h-touch rounded-md border px-3 font-mono text-sm ${
                        camaSeleccionada?.id === cama.id
                          ? 'border-institucional-600 bg-institucional-100 text-institucional-600'
                          : 'border-disponible-500 bg-disponible-100 text-disponible-700'
                      }`}
                    >
                      Cama {cama.numero_cama}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {camaSeleccionada && (
        <section className="rounded-card border border-superficie-200 bg-superficie-0 p-5 shadow-card">
          <h2 className="mb-3 font-display text-lg font-semibold text-superficie-900">
            Datos del paciente — Cama {camaSeleccionada.numero_cama} ({nombreSector(camaSeleccionada.sector_id)})
          </h2>
          <FormularioPaciente
            enviando={enviando}
            textoBoton="Enviar pedido de reserva"
            onCancelar={() => setCamaSeleccionada(null)}
            onEnviar={handleEnviar}
          />
        </section>
      )}
    </div>
  );
}
