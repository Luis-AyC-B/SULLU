// src/features/registro-ingresos/components/IngresosTable.tsx
"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/shared/components/ui/table";
import { IngresosTableRow } from "./IngresosTableRow";
import { IngresoCard } from "./IngresoCard";
import type { Ingreso } from "../types/ingresos.types";

interface IngresosTableProps {
  /** Ingresos ya filtrados, del más reciente al más antiguo. */
  ingresos: Ingreso[];
  isLoading: boolean;
  /** true si hay texto en el buscador (cambia el mensaje de lista vacía). */
  hayBusqueda?: boolean;
  ingresados: number;
  total: number;
}

const SKELETON_ROWS = 5;

export function IngresosTable({
  ingresos,
  isLoading,
  hayBusqueda = false,
  ingresados,
  total,
}: IngresosTableProps) {
  const vacio = !isLoading && ingresos.length === 0;
  const mensajeVacio = hayBusqueda
    ? "No se encontraron ingresos para tu búsqueda."
    : "Aún no hay ingresos registrados en este examen.";

  const n = ingresos.length;
  const casosExcepcionales = ingresos.filter((i) => Boolean(i.casoExcepcional)).length;
  const resumen = `${n} ${n === 1 ? "ingreso reciente" : "ingresos recientes"} · ${ingresados} de ${total} estudiantes registrados${
    casosExcepcionales > 0
      ? ` · ${casosExcepcionales} ${casosExcepcionales === 1 ? "caso excepcional" : "casos excepcionales"}`
      : ""
  }`;

  return (
    <>
      {/* Desktop / tablet: tabla con scroll horizontal suave */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table className="min-w-[640px]">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-label px-4 py-3">Hora</TableHead>
              <TableHead className="text-label px-4 py-3">Código SIS</TableHead>
              <TableHead className="text-label px-4 py-3">Estudiante</TableHead>
              <TableHead className="text-label px-4 py-3">Método</TableHead>
              <TableHead className="text-label px-4 py-3">Estado</TableHead>
              <TableHead className="text-label px-4 py-3">Caso excepcional</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j} className="px-4 py-5">
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {vacio && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-body text-muted-foreground">{mensajeVacio}</p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              ingresos.map((ingreso, idx) => (
                <IngresosTableRow
                  key={ingreso.id}
                  ingreso={ingreso}
                  destacado={idx === 0 && !hayBusqueda}
                />
              ))}
          </TableBody>
        </Table>

        {!isLoading && (
          <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
            {resumen}
          </p>
        )}
      </div>

      {/* Mobile: tarjetas apiladas */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading &&
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={`card-skeleton-${i}`}
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}

        {vacio && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-body text-muted-foreground">{mensajeVacio}</p>
          </div>
        )}

        {!isLoading &&
          ingresos.map((ingreso, idx) => (
            <IngresoCard
              key={ingreso.id}
              ingreso={ingreso}
              destacado={idx === 0 && !hayBusqueda}
            />
          ))}

        {!isLoading && (
          <p className="px-2 py-1 text-center text-xs text-muted-foreground">
            {resumen}
          </p>
        )}
      </div>
    </>
  );
}
