import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cama, Hospital, Paciente, SolicitudDerivacion } from '@/types/database.types';

export interface SolicitudConDetalle extends SolicitudDerivacion {
  paciente: Paciente;
  hospitalOrigen: Hospital;
  hospitalDestino: Hospital;
  cama: Cama;
}

interface Resultado {
  entrantes: SolicitudConDetalle[];
  enviadas: SolicitudConDetalle[];
  loading: boolean;
}

/**
 * Solicitudes de derivación donde este hospital es origen o destino, con
 * los datos de paciente/hospitales/cama ya resueltos. Se re-sincroniza
 * solo vía Realtime (necesita: alter publication supabase_realtime add
 * table public.solicitudes_derivacion;).
 */
export function useSolicitudesDerivacion(hospitalId?: string): Resultado {
  const [entrantes, setEntrantes] = useState<SolicitudConDetalle[]>([]);
  const [enviadas, setEnviadas] = useState<SolicitudConDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!hospitalId) return;

    const [{ data: entrantesData }, { data: enviadasData }] = await Promise.all([
      supabase
        .from('solicitudes_derivacion')
        .select('*')
        .eq('hospital_destino_id', hospitalId)
        .order('fecha_solicitud', { ascending: false }),
      supabase
        .from('solicitudes_derivacion')
        .select('*')
        .eq('hospital_origen_id', hospitalId)
        .order('fecha_solicitud', { ascending: false }),
    ]);

    const todas = [...(entrantesData ?? []), ...(enviadasData ?? [])];

    const pacienteIds = [...new Set(todas.map((s) => s.paciente_id))];
    const hospitalIds = [...new Set(todas.flatMap((s) => [s.hospital_origen_id, s.hospital_destino_id]))];
    const camaIds = [...new Set(todas.map((s) => s.cama_id))];

    const [{ data: pacientesData }, { data: hospitalesData }, { data: camasData }] = await Promise.all([
      pacienteIds.length ? supabase.from('pacientes').select('*').in('id', pacienteIds) : Promise.resolve({ data: [] as Paciente[] }),
      hospitalIds.length ? supabase.from('hospitales').select('*').in('id', hospitalIds) : Promise.resolve({ data: [] as Hospital[] }),
      camaIds.length ? supabase.from('camas').select('*').in('id', camaIds) : Promise.resolve({ data: [] as Cama[] }),
    ]);

    const pacientesPorId = new Map((pacientesData ?? []).map((p) => [p.id, p]));
    const hospitalesPorId = new Map((hospitalesData ?? []).map((h) => [h.id, h]));
    const camasPorId = new Map((camasData ?? []).map((c) => [c.id, c]));

    function enriquecer(lista: SolicitudDerivacion[]): SolicitudConDetalle[] {
      return lista
        .map((s) => {
          const paciente = pacientesPorId.get(s.paciente_id);
          const hospitalOrigen = hospitalesPorId.get(s.hospital_origen_id);
          const hospitalDestino = hospitalesPorId.get(s.hospital_destino_id);
          const cama = camasPorId.get(s.cama_id);
          if (!paciente || !hospitalOrigen || !hospitalDestino || !cama) return null;
          return { ...s, paciente, hospitalOrigen, hospitalDestino, cama };
        })
        .filter((x): x is SolicitudConDetalle => x !== null);
    }

    setEntrantes(enriquecer(entrantesData ?? []));
    setEnviadas(enriquecer(enviadasData ?? []));
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    setLoading(true);
    cargar();

    if (!hospitalId) return;

    // Dos suscripciones porque el filtro de Realtime sólo admite una
    // condición de igualdad — este hospital puede ser origen O destino.
    const channel = supabase
      .channel(`solicitudes-${hospitalId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_derivacion', filter: `hospital_destino_id=eq.${hospitalId}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_derivacion', filter: `hospital_origen_id=eq.${hospitalId}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'camas', filter: `hospital_id=eq.${hospitalId}` },
        () => cargar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospitalId, cargar]);

  return { entrantes, enviadas, loading };
}
