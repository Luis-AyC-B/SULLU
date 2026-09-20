"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import { TableRow, TableCell } from "@/shared/components/ui/table";
import { EstudianteExamen } from "../types/estudiante.types";

interface EstudianteTableRowProps {
  estudiante: EstudianteExamen;
  canHabilitar?: boolean;
  onInhabilitarClick: (estudiante: EstudianteExamen) => void;
  onHabilitarClick: (estudiante: EstudianteExamen) => void;
}

export function EstudianteTableRow({
  estudiante,
  canHabilitar = true,
  onInhabilitarClick,
  onHabilitarClick,
}: EstudianteTableRowProps) {
  const isHabilitado = estudiante.estado_habilitado;

  return (
    <TableRow className="hover:bg-slate-50/75 transition-colors border-b border-slate-100">
      {/* Columna: ESTUDIANTE */}
      <TableCell className="py-3.5 pl-5">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-xs sm:text-sm">
            {estudiante.nombre} {estudiante.apellido}
          </span>
          {estudiante.ci && (
            <span className="text-[11px] text-slate-600">
              CI: {estudiante.ci}
            </span>
          )}
        </div>
      </TableCell>

      {/* Columna: CÓDIGO */}
      <TableCell className="py-3.5">
        <span className="inline-block rounded-md bg-[#F2F4F7] px-2.5 py-0.5 font-mono text-xs font-medium text-slate-700 tracking-tight">
          {estudiante.cod_sis}
        </span>
      </TableCell>

      {/* Columna: ESTADO */}
      <TableCell className="py-3.5">
        {isHabilitado ? (
          <span className="inline-flex items-center rounded-full bg-[#EBFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#027A48] border border-[#ABEFC6]">
            Habilitado
          </span>
        ) : estudiante.motivo_inhabilitacion ? (
          <span className="inline-flex items-center rounded-full bg-[#FEF3F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#B42318] border border-[#FECDCA]">
            Inhabilitado
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[#F8F9FA] px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
            No habilitado
          </span>
        )}
      </TableCell>

      {/* Columna: MOTIVO */}
      <TableCell className="py-3.5 text-xs">
        {estudiante.motivo_inhabilitacion ? (
          <span className="text-[#D92D20] font-medium">
            {estudiante.motivo_inhabilitacion}
          </span>
        ) : (
          <span className="text-rose-400 font-medium">—</span>
        )}
      </TableCell>

      {/* Columna: INHABILITAR (Acción protegida por permiso estudiantes.habilitar) */}
      {canHabilitar && (
        <TableCell className="py-3.5 pr-5 text-right">
          {isHabilitado ? (
            <button
              type="button"
              onClick={() => onInhabilitarClick(estudiante)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title={`Inhabilitar a ${estudiante.nombre} ${estudiante.apellido}`}
              aria-label={`Inhabilitar a ${estudiante.nombre} ${estudiante.apellido}`}
            >
              <Ban className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onHabilitarClick(estudiante)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
              title={`Habilitar a ${estudiante.nombre} ${estudiante.apellido}`}
              aria-label={`Habilitar a ${estudiante.nombre} ${estudiante.apellido}`}
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}