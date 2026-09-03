import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Cama, Hospital, Ocupacion, Paciente, Sector } from '@/types/database.types';

interface AltaConDetalle extends Ocupacion {
  paciente: Paciente;
  cama: Cama;
  sector: Sector | undefined;
  hospitalOrigen: Hospital | undefined;
}

export function HistorialAltasPage() {
  const { hospitalActual } = useAuth();
  const [altas, setAltas] = useState<AltaConDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalActual) return;

    async function cargar() {
      setLoading(true);

      const { data: ocupacionesData } = await supabase
        .from('ocupaciones')
        .select('*')
        .eq('hospital_id', hospitalActual!.id)
        .not('fecha_egreso', 'is', null)
        .order('fecha_egreso', { ascending: false });

      const lista = ocupacionesData ?? [];

      const pacienteIds = [...new Set(lista.map((o) => o.paciente_id))];
      const camaIds = [...new Set(lista.map((o) => o.cama_id))];
      const hospitalOrigenIds = [
        ...new Set(lista.map((o) => o.derivado_de_hospital_id).filter((id): id is string => !!id)),
      ];

      const [{ data: pacientesData }, { data: camasData }, { data: hospitalesData }] = await Promise.all([
        pacienteIds.length ? supabase.from('pacientes').select('*').in('id', pacienteIds) : Promise.resolve({ data: [] as Paciente[] }),
        camaIds.length ? supabase.from('camas').select('*').in('id', camaIds) : Promise.resolve({ data: [] as Cama[] }),
        hospitalOrigenIds.length
          ? supabase.from('hospitales').select('*').in('id', hospitalOrigenIds)
          : Promise.resolve({ data: [] as Hospital[] }),
      ]);

      const camasPorId = new Map((camasData ?? []).map((c) => [c.id, c]));
      const sectorIds = [...new Set((camasData ?? []).map((c) => c.sector_id))];
      const { data: sectoresData } = sectorIds.length
        ? await supabase.from('sectores').select('*').in('id', sectorIds)
        : { data: [] as Sector[] };

      const pacientesPorId = new Map((pacientesData ?? []).map((p) => [p.id, p]));
      const sectoresPorId = new Map((sectoresData ?? []).map((s) => [s.id, s]));
      const hospitalesPorId = new Map((hospitalesData ?? []).map((h) => [h.id, h]));

      const enriquecidas: AltaConDetalle[] = [];
      for (const o of lista) {
        const paciente = pacientesPorId.get(o.paciente_id);
        const cama = camasPorId.get(o.cama_id);
        if (!paciente || !cama) continue;
        enriquecidas.push({
          ...o,
          paciente,
          cama,
          sector: sectoresPorId.get(cama.sector_id),
          hospitalOrigen: o.derivado_de_hospital_id
            ? hospitalesPorId.get(o.derivado_de_hospital_id)
            : undefined,
        });
      }

      setAltas(enriquecidas);
      setLoading(false);
    }

    cargar();
  }, [hospitalActual?.id]);

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
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-superficie-900">Historial de altas</h1>
        <p className="text-sm text-superficie-400">{hospitalActual?.nombre}</p>
      </div>

      {loading && <p className="text-sm text-superficie-400">Cargando…</p>}

      {!loading && altas.length === 0 && (
        <p className="text-sm text-superficie-400">Todavía no hay ninguna alta registrada.</p>
      )}

      {!loading &&
        altas.map((alta) => (
          <div
            key={alta.id}
            className="space-y-1 rounded-card border border-superficie-200 bg-superficie-0 p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-superficie-900">{alta.paciente.apellido_nombre}</p>
              <span className="font-mono text-xs text-superficie-400">
                {alta.sector?.nombre ?? '—'} · Cama {alta.cama.numero_cama}
              </span>
            </div>
            <p className="text-sm text-superficie-600">{alta.diagnostico}</p>
            <p className="text-xs text-superficie-400">
              Ingresó {formatearFecha(alta.fecha_ingreso)} — Alta {formatearFecha(alta.fecha_egreso!)}
              {alta.hospitalOrigen && ` · Derivado de ${alta.hospitalOrigen.nombre}`}
            </p>
          </div>
        ))}
    </div>
  );
}
