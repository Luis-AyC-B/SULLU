/**
 * Funciones de formateo de fechas y horas para el módulo de exámenes (HU6).
 */

const MESES_ABR = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatearFechaCorta(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dia = d.getDate();
    const mes = MESES_ABR[d.getMonth()];
    const anio = d.getFullYear();
    return `${dia} ${mes} ${anio}`;
  } catch {
    return isoString;
  }
}

export function formatearHora(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      if (isoString.includes(':')) return isoString.slice(0, 5);
      return isoString;
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return isoString;
  }
}

export function formatearFechaYHora(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hh}:${mm}`;
  } catch {
    return isoString;
  }
}
