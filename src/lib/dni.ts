const DOMINIO_SINTETICO = 'dni.sistema-camas.local';

export function dniToEmail(dni: string): string {
  const limpio = dni.trim().replace(/\D/g, '');
  return `dni-${limpio}@${DOMINIO_SINTETICO}`;
}
