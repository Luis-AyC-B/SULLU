"use client";

import type { ResumenEnVivoData } from "../../types/control-ingreso.types";

interface ResumenEnVivoCardProps {
  resumen: ResumenEnVivoData | null;
  isLoading: boolean;
}

export function ResumenEnVivoCard({
  resumen,
  isLoading,
}: ResumenEnVivoCardProps) {
  const ingresados = resumen?.ingresados ?? 38;
  const pendientes = resumen?.pendientes ?? 47;
  const incidencias = resumen?.incidencias ?? 2;

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Resumen en vivo
        </h3>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-700">En línea</span>
        </div>
      </div>

      {/* Diseño unificado: 3 filas apiladas con fondo temático */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-xl bg-[#f0f4f9] px-4 py-3">
          <span className="text-xs font-semibold text-slate-600">Ingresados</span>
          <span className="text-xl font-black text-[#002D62]">
            {isLoading ? "..." : ingresados}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold text-slate-600">Pendientes</span>
          <span className="text-xl font-black text-slate-800">
            {isLoading ? "..." : pendientes}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-amber-50/70 px-4 py-3">
          <span className="text-xs font-semibold text-amber-800">Incidencias</span>
          <span className="text-xl font-black text-amber-700">
            {isLoading ? "..." : incidencias}
          </span>
        </div>
      </div>
    </div>
  );
}
