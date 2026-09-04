import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Novedad } from '@/types/database.types';

export function useNovedadesPendientes(hospitalId?: string, personaId?: string) {
  const [pendientes, setPendientes] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId || !personaId) {
      setLoading(false);
      return;
    }

    async function cargar() {
      const [{ data: activas }, { data: vistas }] = await Promise.all([
        supabase.from('novedades').select('*').eq('hospital_id', hospitalId!).eq('activa', true),
        supabase.from('novedades_vistas').select('novedad_id').eq('persona_id', personaId!),
      ]);

      const vistasIds = new Set((vistas ?? []).map((v) => v.novedad_id));
      const sinVer = (activas ?? []).filter((n) => !vistasIds.has(n.id));

      setPendientes(sinVer);
      setLoading(false);
    }

    cargar();
  }, [hospitalId, personaId]);

  async function marcarVista(novedadId: string) {
    await supabase.rpc('marcar_novedad_vista', { p_novedad_id: novedadId });
    setPendientes((prev) => prev.filter((n) => n.id !== novedadId));
  }

  return { pendientes, loading, marcarVista };
}
