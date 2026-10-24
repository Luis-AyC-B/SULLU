"use client";

import { ClipboardCheck, BookOpen, Clock, GraduationCap } from "lucide-react";
import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface ExamenActivoHeaderCardProps {
  examen: ExamenAsignado;
  onCambiarExamen: () => void;
}

export function ExamenActivoHeaderCard({
  examen,
  onCambiarExamen,
}: ExamenActivoHeaderCardProps) {
  const isEnCurso = examen.estado === "EN_CURSO";
  const isFinalizado = examen.estado === "FINALIZADO";

  const getBadgeConfig = () => {
    if (isEnCurso) {
      return {
        label: "En curso",
        className: "bg-[#eafaf1] text-[#0e8a55] border border-[#a3e6c3]/50",
        dotColor: "bg-emerald-400",
      };
    }
    if (isFinalizado) {
      return {
        label: "Finalizado",
        className: "bg-slate-100 text-slate-600 border border-slate-200/60",
        dotColor: "bg-slate-400",
      };
    }
    return {
      label: "Próximo",
      className: "bg-blue-50 text-blue-700 border border-blue-200/60",
      dotColor: "bg-blue-400",
    };
  };

  const badge = getBadgeConfig();

  return (
    <>
      {/* VERSIÓN MOBILE: Tarjeta azul marina completa */}
      <div className="block md:hidden w-full rounded-2xl bg-[#002D62] text-white p-4 shadow-sm mb-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 shrink-0">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-bold truncate text-white">
                  {examen.asignatura}
                </h2>
                <span className={`h-2 w-2 rounded-full ${badge.dotColor} shrink-0`} />
              </div>
              {examen.docente && (
                <p className="text-xs text-white/80 truncate">
                  Docente: {examen.docente}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCambiarExamen}
            className="text-xs font-semibold text-white/90 hover:text-white underline-offset-2 hover:underline shrink-0 px-2 py-1 rounded cursor-pointer"
          >
            Cambiar
          </button>
        </div>

        <p className="text-xs text-white/80 pl-10.5 truncate">
          {examen.ambiente} · {examen.horario}
        </p>
      </div>

      {/* VERSIÓN DESKTOP: Tarjeta blanca con borde azul y metadatos completos */}
      <div className="hidden md:block w-full rounded-2xl border-2 border-[#002D62] bg-white p-6 shadow-xs mb-6 animate-in fade-in duration-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#002D62]">
              <ClipboardCheck className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {examen.asignatura}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              {examen.docente && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                  Docente: {examen.docente}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCambiarExamen}
            className="text-sm font-semibold text-slate-700 hover:text-[#002D62] transition-colors cursor-pointer"
          >
            Cambiar examen
          </button>
        </div>

        {/* Fila de metadatos: Ambiente, Horario y Habilitados */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-8 text-sm text-slate-600 pl-14.5">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{examen.ambiente}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>{examen.horario}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GraduationCap className="h-4 w-4 text-slate-400" />
            <span>{examen.totalEstudiantes} habilitados</span>
          </div>
        </div>
      </div>
    </>
  );
}
