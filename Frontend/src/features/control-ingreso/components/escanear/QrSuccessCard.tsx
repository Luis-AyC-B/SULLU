"use client";

import { Check, Clock, Volume2 } from "lucide-react";
import type { EstudianteQrResultado } from "../../types/control-ingreso.types";

interface QrSuccessCardProps {
  estudiante: EstudianteQrResultado;
}

export function QrSuccessCard({ estudiante }: QrSuccessCardProps) {
  return (
    <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-30 animate-in zoom-in-95 fade-in duration-200">
      <div className="bg-[#0D5C3A] text-white rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center border border-emerald-400/30">
        {/* Círculo blanco con Check verde */}
        <div className="h-14 w-14 rounded-full bg-white text-[#0D5C3A] flex items-center justify-center mb-4 shadow-md">
          <Check className="h-8 w-8 stroke-[3]" />
        </div>

        {/* Título de Confirmación */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          Ingreso registrado
        </h3>

        {/* Datos del Estudiante */}
        <p className="text-base sm:text-lg font-semibold text-white">
          {estudiante.nombre} {estudiante.apellido ?? ""}
        </p>

        <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-0.5">
          {estudiante.codSis}
        </p>

        {estudiante.carrera && (
          <p className="text-xs sm:text-sm text-emerald-200/90 mt-0.5">
            {estudiante.carrera}
          </p>
        )}

        {/* Fila de Hora y Confirmación Sonora */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium text-emerald-200/90 bg-[#0A492E]/60 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
          <Clock className="h-3.5 w-3.5" />
          <span>{estudiante.horaIngreso || "12:18:41"}</span>
          <span>·</span>
          <Volume2 className="h-3.5 w-3.5" />
          <span>Confirmación sonora</span>
        </div>

        {/* Subtexto indicando que el escáner sigue listo */}
        <p className="text-[11px] text-emerald-300/80 mt-4 font-normal">
          Listo para escanear al siguiente estudiante...
        </p>
      </div>
    </div>
  );
}
