"use client";

import { Clock, BookOpen, Check } from "lucide-react";
import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface ExamenCardProps {
  examen: ExamenAsignado;
  isSelected: boolean;
  onSelect: (examen: ExamenAsignado) => void;
}

export function ExamenCard({ examen, isSelected, onSelect }: ExamenCardProps) {
  const isEnCurso = examen.estado === "EN_CURSO";

  return (
    <div
      onClick={() => onSelect(examen)}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(examen);
        }
      }}
      className={`relative w-full rounded-2xl bg-white p-5 md:p-6 transition-all duration-200 cursor-pointer select-none text-left shadow-xs outline-none ${
        isSelected
          ? "border-2 border-[#002D62] ring-1 ring-[#002D62]/10 shadow-sm"
          : "border border-slate-200 hover:border-slate-300 hover:shadow-xs"
      }`}
    >
      {/* Fila superior: Badge de estado + Cantidad de estudiantes + Radio/Check */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
              isEnCurso
                ? "bg-[#eafaf1] text-[#0e8a55] border border-[#a3e6c3]/50"
                : "bg-slate-100 text-slate-600 border border-slate-200/60"
            }`}
          >
            {isEnCurso ? "En curso" : "Próximo"}
          </span>
          <span className="text-xs sm:text-sm text-slate-600 font-normal">
            {examen.totalEstudiantes} estudiantes
          </span>
        </div>

        {/* Radio button / Checkmark circular */}
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            isSelected
              ? "bg-[#002D62] text-white shadow-xs"
              : "border-2 border-slate-300 bg-white"
          }`}
        >
          {isSelected && <Check className="h-4 w-4 stroke-[2.5]" />}
        </div>
      </div>

      {/* Nombre de la asignatura */}
      <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-3 tracking-tight">
        {examen.asignatura}
      </h3>

      {/* Fila inferior: Fecha, Horario y Ambiente */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm text-slate-600">
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            {examen.fecha} &nbsp;{examen.horario}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <BookOpen className="h-4 w-4 text-slate-500 shrink-0" />
          <span>{examen.ambiente}</span>
        </div>
      </div>
    </div>
  );
}
