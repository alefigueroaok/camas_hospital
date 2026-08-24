import type { RolSistema } from '@/types/database.types';

export const ROLES = {
  ENFERMERIA: 'enfermeria',
  MEDICO: 'medico',
  ADMINISTRACION: 'administracion',
} as const satisfies Record<string, RolSistema>;
