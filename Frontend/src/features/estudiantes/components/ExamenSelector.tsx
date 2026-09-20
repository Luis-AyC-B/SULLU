"use client";

import { ChevronDown } from "lucide-react";
import { ExamenItem } from "../types/estudiante.types";

interface ExamenSelectorProps {
  examenes: ExamenItem[];
  selectedExamenId: number | null;
  onSelectExamen: (examenId: number) => void;
  totalEstudiantes: number;
  totalHabilitados: number;
}

export function ExamenSelector({
  examenes,
  selectedExamenId,
  onSelectExamen,
  totalEstudiantes,
  totalHabilitados,
}: ExamenSelectorProps) {
  const hasExamenes = examenes.length > 0;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Selector de examen */}
        <div className="flex-1">
          <label
            htmlFor="examen-select"
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Examen a gestionar
          </label>
          <div className="relative">
            <select
              id="examen-select"
              value={selectedExamenId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) onSelectExamen(Number(val));
              }}
              disabled={!hasExamenes}
              className={`w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-[#002D62] focus:outline-hidden focus:ring-1 focus:ring-[#002D62] transition-colors pr-10 ${
                hasExamenes ? "cursor-pointer" : "cursor-not-allowed bg-slate-50 text-slate-400"
              }`}
            >
              {!hasExamenes ? (
                <option value="">No hay exámenes registrados en el sistema</option>
              ) : (
                examenes.map((examen) => (
                  <option key={examen.id} value={examen.id}>
                    {examen.nombreMateria} — {examen.sigla} · {examen.fecha}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Tarjetas de Estadísticas / Contadores */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {/* Total */}
          <div className="flex min-w-[76px] sm:min-w-[88px] flex-col items-center justify-center rounded-lg border border-[#DCE5EF] bg-[#F1F6FB] px-3 py-2 text-center">
            <span className="text-xl sm:text-2xl font-black text-[#002D62] leading-none">
              {totalEstudiantes}
            </span>
            <span className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total
            </span>
          </div>

          {/* Habilitados */}
          <div className="flex min-w-[76px] sm:min-w-[88px] flex-col items-center justify-center rounded-lg border border-[#DCE5EF] bg-[#F1F6FB] px-3 py-2 text-center">
            <span className="text-xl sm:text-2xl font-black text-[#002D62] leading-none">
              {totalHabilitados}
            </span>
            <span className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Habilitados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}