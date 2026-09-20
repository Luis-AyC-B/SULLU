"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/shared/components/ui/table";
import { useHasPermission } from "@/shared/hooks/useHasPermission";
import { EstudianteExamen } from "../types/estudiante.types";
import { EstudianteTableRow } from "./EstudianteTableRow";
import { EstudianteCard } from "./EstudianteCard";

interface EstudiantesTableProps {
  estudiantes: EstudianteExamen[];
  isLoading: boolean;
  onInhabilitarClick: (estudiante: EstudianteExamen) => void;
  onHabilitarClick: (estudiante: EstudianteExamen) => void;
}

const SKELETON_ROWS = 6;

export function EstudiantesTable({
  estudiantes,
  isLoading,
  onInhabilitarClick,
  onHabilitarClick,
}: EstudiantesTableProps) {
  const canHabilitar = useHasPermission("estudiantes.habilitar");
  const columnCount = canHabilitar ? 5 : 4;

  return (
    <>
      {/* Vista Desktop / Tablet (md en adelante) */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50/70 border-b border-slate-200">
            <TableRow>
              <TableHead className="py-3 pl-5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Estudiante
              </TableHead>
              <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Código
              </TableHead>
              <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Estado
              </TableHead>
              <TableHead className="py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Motivo
              </TableHead>
              {canHabilitar && (
                <TableHead className="py-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Inhabilitar
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skeleton-row-${i}`} className="border-b border-slate-100">
                  <TableCell className="py-4 pl-5">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                  </TableCell>
                  {canHabilitar && (
                    <TableCell className="py-4 pr-5 text-right">
                      <div className="inline-block h-6 w-6 animate-pulse rounded-full bg-slate-200" />
                    </TableCell>
                  )}
                </TableRow>
              ))}

            {!isLoading && estudiantes.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    No se encontraron estudiantes que coincidan con la búsqueda o filtro.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              estudiantes.map((estudiante) => (
                <EstudianteTableRow
                  key={estudiante.estudiante_id}
                  estudiante={estudiante}
                  canHabilitar={canHabilitar}
                  onInhabilitarClick={onInhabilitarClick}
                  onHabilitarClick={onHabilitarClick}
                />
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Vista Mobile (< md) */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`skeleton-card-${i}`}
              className="h-28 animate-pulse rounded-xl bg-slate-100 border border-slate-200"
            />
          ))}

        {!isLoading && estudiantes.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              No se encontraron estudiantes que coincidan con la búsqueda o filtro.
            </p>
          </div>
        )}

        {!isLoading &&
          estudiantes.map((estudiante) => (
            <EstudianteCard
              key={estudiante.estudiante_id}
              estudiante={estudiante}
              onInhabilitarClick={onInhabilitarClick}
              onHabilitarClick={onHabilitarClick}
            />
          ))}
      </div>
    </>
  );
}
