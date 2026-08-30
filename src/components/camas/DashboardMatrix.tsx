import { useMemo } from 'react';
import { ESTADOS_CAMA } from '@/constants/estadoCama';
import type { Cama, Sector } from '@/types/database.types';
import type { OcupacionConPaciente } from '@/hooks/useCamasDelHospital';

const ORDEN_ESTADOS = ['libre', 'ocupada', 'reservada'] as const;

interface Props {
  sectores: Sector[];
  camas: Cama[];
  ocupacionesPorCama: Map<string, OcupacionConPaciente>;
}

export function DashboardMatrix({ sectores, camas, ocupacionesPorCama }: Props) {
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap gap-3">
        {ORDEN_ESTADOS.map((estado) => {
          const m = ESTADOS_CAMA[estado];
          return (
            <span
              key={estado}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${m.bg100} ${m.text700}`}
            >
              <span className={`h-2 w-2 rounded-full ${m.solid500}`} aria-hidden />
              {m.label}
            </span>
          );
        })}
      </div>

      {sectores.map((sector) => {
        const camasDelSector = camasPorSector.get(sector.id) ?? [];
        return (
          <section
            key={sector.id}
            className="overflow-hidden rounded-card border border-superficie-200 bg-superficie-0 shadow-card"
          >
            <header className="bg-institucional-800 px-5 py-3">
              <h2 className="font-display text-base font-semibold text-white">{sector.nombre}</h2>
            </header>

            <div className="grid grid-cols-6 gap-2 p-4 sm:grid-cols-8 md:grid-cols-10">
              {camasDelSector.length === 0 && (
                <p className="col-span-full text-sm text-superficie-400">Sin camas en este sector.</p>
              )}
              {camasDelSector.map((cama) => {
                const m = ESTADOS_CAMA[cama.estado];
                const ocupacion = ocupacionesPorCama.get(cama.id);
                return (
                  <div
                    key={cama.id}
                    title={ocupacion ? ocupacion.paciente.apellido_nombre : m.label}
                    className={`flex aspect-square flex-col items-center justify-center rounded-md border ${m.border500} ${m.bg100}`}
                  >
                    <span className={`font-mono text-sm font-semibold ${m.text700}`}>
                      {cama.numero_cama}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
