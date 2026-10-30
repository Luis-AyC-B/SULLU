import type { Incidencia } from "../types/incidencias.types";

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function coincideBusqueda(
  nombre: string,
  codigoSis: string,
  consulta: string,
): boolean {
  const q = normalizarTexto(consulta);
  if (!q) return true;
  return normalizarTexto(nombre).includes(q) || codigoSis.includes(q);
}

export function filtrarIncidencias(
  incidencias: Incidencia[],
  consulta: string,
): Incidencia[] {
  return incidencias.filter((i) =>
    coincideBusqueda(i.estudianteNombre, i.codigoSis, consulta),
  );
}