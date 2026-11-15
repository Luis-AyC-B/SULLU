"use client";

import React from "react";

interface AttendanceProgressBarProps {
  presentes: number;
  habilitados: number;
  porcentajePresentes: number;
}

export function AttendanceProgressBar({
  presentes,
  habilitados,
  porcentajePresentes,
}: AttendanceProgressBarProps) {
  // Asegurar valor entre 0 y 100 sin NaN
  const clampedPercentage = Math.min(
    100,
    Math.max(0, isNaN(porcentajePresentes) ? 0 : porcentajePresentes)
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#1A1D23]">
          Progreso de asistencia
        </h3>
        <span className="text-xs text-gray-500 font-medium">
          <span className="hidden sm:inline">
            {presentes} de {habilitados} estudiantes presentes
          </span>
          <span className="sm:hidden">
            {presentes} de {habilitados}
          </span>
        </span>
      </div>

      {/* Barra de progreso */}
      <div
        className="mt-3.5 h-3.5 w-full bg-gray-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de asistencia del examen"
      >
        <div
          className="h-full bg-[#0D9488] rounded-full transition-all duration-500"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-6 text-xs font-semibold text-gray-700">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-[2px] bg-[#0D9488]" />
          <span>Presentes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-[2px] bg-[#C2410C]" />
          <span>Ausentes</span>
        </div>
      </div>
    </div>
  );
}
