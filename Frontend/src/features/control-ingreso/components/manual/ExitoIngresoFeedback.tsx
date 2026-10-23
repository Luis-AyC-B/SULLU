"use client";

import { CheckCircle2 } from "lucide-react";
import type { EstudianteBusquedaItem } from "../../types/control-ingreso.types";

interface ExitoIngresoFeedbackProps {
  estudiante: EstudianteBusquedaItem;
  onContinuar: () => void;
  onCerrar: () => void;
}

export function ExitoIngresoFeedback({
  estudiante,
  onContinuar,
  onCerrar,
}: ExitoIngresoFeedbackProps) {
  return (
    <div className="flex flex-col items-center text-center p-4 gap-4 animate-in fade-in duration-300">
      <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-4 border-emerald-100/80 shadow-xs">
        <CheckCircle2 className="h-9 w-9" />
      </div>

      <div>
        <h4 className="text-lg font-bold text-slate-900">
          ¡Ingreso registrado con éxito!
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Se registró correctamente el ingreso de{" "}
          <span className="font-semibold text-slate-700">
            {estudiante.nombre} {estudiante.apellido ?? ""}
          </span>{" "}
          ({estudiante.codSis}).
        </p>
      </div>

      <div className="w-full max-w-sm p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">Método:</span>
          <span className="font-semibold text-slate-800">Manual</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Fecha y hora:</span>
          <span className="font-semibold text-slate-800">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm pt-2">
        <button
          type="button"
          onClick={onContinuar}
          className="w-full py-2.5 px-4 bg-[#002D62] hover:bg-[#001D42] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Nuevo registro
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="w-full py-2.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Cerrar ventana
        </button>
      </div>
    </div>
  );
}
