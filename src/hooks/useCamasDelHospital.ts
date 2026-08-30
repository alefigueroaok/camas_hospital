import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cama, Ocupacion, Paciente } from '@/types/database.types';

export interface OcupacionConPaciente extends Ocupacion {
  paciente: Paciente;
}

interface UseCamasResult {
  camas: Cama[];
  ocupacionesPorCama: Map<string, OcupacionConPaciente>;
  loading: boolean;
  error: string | null;
}

/**
 * Trae las camas de un hospital + los datos de paciente de cada ocupación
 * activa, y se re-sincroniza solo vía Realtime cuando cambia una cama
 * (INSERT/UPDATE/DELETE) — sin necesidad de recargar la página.
 *
 * IMPORTANTE: para que el Realtime funcione hace falta correr una vez en
 * Supabase: alter publication supabase_realtime add table public.camas;
 */
export function useCamasDelHospital(hospitalId?: string): UseCamasResult {
  const [camas, setCamas] = useState<Cama[]>([]);
  const [ocupacionesPorCama, setOcupacionesPorCama] = useState<Map<string, OcupacionConPaciente>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!hospitalId) return;

    const { data: camasData, error: camasError } = await supabase
      .from('camas')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('numero_cama');

    if (camasError) {
      setError(camasError.message);
      setLoading(false);
      return;
    }
    setCamas(camasData ?? []);

    const { data: ocupacionesData } = await supabase
      .from('ocupaciones')
      .select('*')
      .eq('hospital_id', hospitalId)
      .is('fecha_egreso', null);

    if (ocupacionesData && ocupacionesData.length > 0) {
      const pacienteIds = ocupacionesData.map((o) => o.paciente_id);
      const { data: pacientesData } = await supabase
        .from('pacientes')
        .select('*')
        .in('id', pacienteIds);

      const pacientesPorId = new Map((pacientesData ?? []).map((p) => [p.id, p]));
      const mapa = new Map<string, OcupacionConPaciente>();
      for (const o of ocupacionesData) {
        const paciente = pacientesPorId.get(o.paciente_id);
        if (paciente) mapa.set(o.cama_id, { ...o, paciente });
      }
      setOcupacionesPorCama(mapa);
    } else {
      setOcupacionesPorCama(new Map());
    }

    setError(null);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    setLoading(true);
    cargar();

    if (!hospitalId) return;

    // Un cambio de estado en "camas" casi siempre viene acompañado de un
    // cambio en "ocupaciones" (se abrió o se cerró una). En vez de tratar
    // de mergear ambas cosas a mano evento por evento, más simple y menos
    // propenso a bugs: cualquier cambio en camas dispara un refetch de todo.
    const channel = supabase
      .channel(`camas-hospital-${hospitalId}`)
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

  return { camas, ocupacionesPorCama, loading, error };
}
