// src/features/registro-ingresos/lib/filtrarIngresos.ts
import type { Ingreso } from "../types/ingresos.types";

/** Minúsculas y sin tildes: "López" coincide con "lopez". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Filtra por código SIS o nombre del estudiante. Sin texto, devuelve todo. */
export function filtrarIngresos(ingresos: Ingreso[], busqueda: string): Ingreso[] {
  const q = normalizar(busqueda);
  if (!q) return ingresos;
  return ingresos.filter(
    (i) => i.sis.includes(q) || normalizar(i.estudiante).includes(q),
  );
}