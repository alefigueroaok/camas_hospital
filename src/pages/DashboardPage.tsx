import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCamasDelHospital } from '@/hooks/useCamasDelHospital';
import { CamaCardMobile } from '@/components/camas/CamaCardMobile';
import { DashboardMatrix } from '@/components/camas/DashboardMatrix';
import { supabase } from '@/lib/supabase';
import { ROLES } from '@/constants/roles';
import type { Sector } from '@/types/database.types';

export function DashboardPage() {
  const { persona, hospitalActual, rolActual } = useAuth();
  const { camas, ocupacionesPorCama, loading, error } = useCamasDelHospital(hospitalActual?.id);
  const [sectores, setSectores] = useState<Sector[]>([]);

  useEffect(() => {
    if (!hospitalActual) return;
    supabase
      .from('sectores')
      .select('*')
      .eq('hospital_id', hospitalActual.id)
      .order('nombre')
      .then(({ data }) => setSectores(data ?? []));
  }, [hospitalActual?.id]);

  const nombreSector = (sectorId: string) => sectores.find((s) => s.id === sectorId)?.nombre;

  return (
    <div className="min-h-[calc(100vh-57px)] bg-superficie-50">
      <header className="space-y-1 px-6 pt-6">
        <h1 className="font-display text-2xl font-semibold text-superficie-900">
          {hospitalActual?.nombre}
        </h1>
        <p className="text-sm text-superficie-400">
          Hola {persona?.nombre} — rol: {rolActual}
        </p>
      </header>

      {rolActual === ROLES.ADMINISTRACION && (
        <div className="flex flex-wrap gap-3 px-6 pt-4">
          <Link
            to="/alta-personal"
            className="inline-block rounded-md bg-institucional-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Dar de alta personal
          </Link>
          <Link
            to="/sectores"
            className="inline-block rounded-md border border-institucional-600 px-4 py-2 text-sm font-semibold text-institucional-600"
          >
            Sectores y camas
          </Link>
        </div>
      )}

      <div className="p-6">
        {loading && <p className="text-sm text-superficie-400">Cargando camas…</p>}
        {error && <p className="text-sm text-ocupada-700">Error: {error}</p>}
        {!loading && !error && sectores.length === 0 && (
          <p className="text-sm text-superficie-400">
            Todavía no hay sectores ni camas cargadas en este hospital.
          </p>
        )}
      </div>

      {!loading && !error && camas.length > 0 && (
        <>
          {/* Mobile-first: tarjetas grandes y táctiles, una por fila. */}
          <div className="px-6 pb-6 md:hidden">
            <div className="space-y-3">
              {camas.map((cama) => (
                <CamaCardMobile
                  key={cama.id}
                  cama={cama}
                  sectorNombre={nombreSector(cama.sector_id)}
                  ocupacion={ocupacionesPorCama.get(cama.id)}
                />
              ))}
            </div>
          </div>

          {/* Desde md hacia arriba, la matriz agrupada por sector. */}
          <div className="hidden md:block">
            <DashboardMatrix
              sectores={sectores}
              camas={camas}
              ocupacionesPorCama={ocupacionesPorCama}
            />
          </div>
        </>
      )}
    </div>
  );
}
