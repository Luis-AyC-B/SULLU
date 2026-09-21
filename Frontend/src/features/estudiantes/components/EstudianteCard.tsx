"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import { EstudianteExamen } from "../types/estudiante.types";

interface EstudianteCardProps {
  estudiante: EstudianteExamen;
  canHabilitar?: boolean;
  onInhabilitarClick: (estudiante: EstudianteExamen) => void;
  onHabilitarClick: (estudiante: EstudianteExamen) => void;
}

export function EstudianteCard({
  estudiante,
  canHabilitar = true,
  onInhabilitarClick,
  onHabilitarClick,
}: EstudianteCardProps) {
  const isHabilitado = estudiante.estado_habilitado;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">
            {estudiante.nombre} {estudiante.apellido}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#F2F4F7] px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
              {estudiante.cod_sis}
            </span>
            {estudiante.ci && (
              <span className="text-xs text-slate-600">CI: {estudiante.ci}</span>
            )}
          </div>
        </div>

        {/* Botón de acción (solo si tiene permisos y el examen no ha concluido) */}
        {canHabilitar && (
          <div>
            {isHabilitado ? (
              <button
                type="button"
                onClick={() => onInhabilitarClick(estudiante)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                title={`Inhabilitar a ${estudiante.nombre}`}
                aria-label={`Inhabilitar a ${estudiante.nombre}`}
              >
                <Ban className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onHabilitarClick(estudiante)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
                title={`Habilitar a ${estudiante.nombre}`}
                aria-label={`Habilitar a ${estudiante.nombre}`}
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <div>
          {isHabilitado ? (
            <span className="inline-flex items-center rounded-full bg-[#EBFDF3] px-2 py-0.5 text-[10px] font-semibold text-[#027A48] border border-[#ABEFC6]">
              Habilitado
            </span>
          ) : estudiante.motivo_inhabilitacion ? (
            <span className="inline-flex items-center rounded-full bg-[#FEF3F2] px-2 py-0.5 text-[10px] font-semibold text-[#B42318] border border-[#FECDCA]">
              Inhabilitado
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#F8F9FA] px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
              No habilitado
            </span>
          )}
        </div>

        {estudiante.motivo_inhabilitacion && (
          <span className="text-[#D92D20] text-xs font-medium text-right truncate max-w-[200px]">
            {estudiante.motivo_inhabilitacion}
          </span>
        )}
      </div>
    </div>
  );
}