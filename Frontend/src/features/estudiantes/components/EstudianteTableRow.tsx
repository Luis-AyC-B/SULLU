"use client";

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
  const correoInstitucional =
    estudiante.correo || `${estudiante.cod_sis.toLowerCase()}@est.umss.edu.bo`;

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
          <span className="text-[11px] text-slate-500 font-mono">
            {correoInstitucional}
          </span>
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

      {/* Columna: ACCIÓN */}
      <TableCell className="py-3.5 text-right pr-5">
        {canHabilitar ? (
          isHabilitado ? (
            <button
              type="button"
              onClick={() => onInhabilitarClick(estudiante)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Inhabilitar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onHabilitarClick(estudiante)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[#027A48] hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              Habilitar
            </button>
          )
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
