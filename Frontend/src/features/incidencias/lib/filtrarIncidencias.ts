import type { Incidencia } from "../types/incidencias.types";

export function normalizarTexto(texto: unknown): string {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function coincideBusqueda(
  nombre: unknown,
  codigoSis: unknown,
  consulta: unknown,
): boolean {
  const q = normalizarTexto(consulta);
  if (!q) return true;
  const nom = normalizarTexto(nombre);
  const sis = normalizarTexto(codigoSis);
  return nom.includes(q) || sis.includes(q);
}

export function filtrarIncidencias(
  incidencias: Incidencia[],
  consulta: string,
): Incidencia[] {
  return incidencias.filter((i) =>
    coincideBusqueda(i.estudianteNombre, i.codigoSis, consulta),
  );
}