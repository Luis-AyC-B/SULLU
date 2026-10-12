"use client";

import type {
  EstudianteBusquedaItem,
  ExamenAsignado,
} from "../../types/control-ingreso.types";

interface ConfirmarIngresoStepProps {
  estudiante: EstudianteBusquedaItem;
  examen: ExamenAsignado;
  onVolver: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
  isSubmitting: boolean;
  errorEnvio: string | null;
}

export function ConfirmarIngresoStep({
  estudiante,
  examen,
  onVolver,
  onCancelar,
  onConfirmar,
  isSubmitting,
  errorEnvio,
}: ConfirmarIngresoStepProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Botón Volver a resultados */}
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer self-start"
      >
        <span>&larr;</span>
        <span>Volver a resultados</span>
      </button>

      {/* Identidad del Estudiante */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-slate-900">
            {estudiante.nombre} {estudiante.apellido ?? ""}
          </h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {estudiante.codSis} · {estudiante.ci}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{estudiante.carrera}</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Habilitado
        </span>
      </div>

      {/* Comparativa de Ambientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            AMBIENTE ASIGNADO
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1">
            {estudiante.ambienteAsignado || examen.ambiente}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            AMBIENTE DEL EXAMEN
          </p>
          <p className="text-sm font-bold text-slate-900 mt-1">
            {examen.ambiente}
          </p>
        </div>
      </div>

      {errorEnvio && (
        <p className="text-xs text-rose-600 font-medium">{errorEnvio}</p>
      )}

      {/* Botones de Acción */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onConfirmar}
          className="px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Confirmando..." : "Confirmar ingreso"}
        </button>
      </div>
    </div>
  );
}
