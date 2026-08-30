import type { EstadoCama } from '@/types/database.types';

interface EstadoMeta {
  label: string;
  bg100: string;
  text700: string;
  solid500: string;
  border500: string;
}

// "libre" reusa la paleta "disponible" del design system (cyan) — mismo
// significado, sólo cambió el nombre del valor en el enum de la base.
export const ESTADOS_CAMA: Record<EstadoCama, EstadoMeta> = {
  libre: { label: 'Libre', bg100: 'bg-disponible-100', text700: 'text-disponible-700', solid500: 'bg-disponible-500', border500: 'border-disponible-500' },
  ocupada: { label: 'Ocupada', bg100: 'bg-ocupada-100', text700: 'text-ocupada-700', solid500: 'bg-ocupada-500', border500: 'border-ocupada-500' },
  reservada: { label: 'Reservada', bg100: 'bg-reservada-100', text700: 'text-reservada-700', solid500: 'bg-reservada-500', border500: 'border-reservada-500' },
};
