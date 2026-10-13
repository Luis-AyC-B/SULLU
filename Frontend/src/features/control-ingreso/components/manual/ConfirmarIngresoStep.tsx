"use client";

import { CheckCircle2, ChevronLeft, ShieldCheck, Building2, UserCheck } from "lucide-react";
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
  const nombreCompleto = `${estudiante.nombre} ${
    estudiante.apellido ?? ""
  }`.trim();
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Botón Volver a resultados */}
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer self-start -ml-1 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Volver a resultados</span>
      </button>

      {/* Cabecera de Identidad del Estudiante */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h4 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
            {nombreCompleto}
          </h4>
          <p className="text-xs md:text-sm text-slate-500 font-mono mt-1">
            {estudiante.codSis.replace(/-/g, "")}
            {estudiante.ci && ` · ${estudiante.ci}`}
          </p>
        </div>

        {/* Badge de Habilitación */}
        <div className="shrink-0">
          {estudiante.estadoHabilitado ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F8F0] text-[#059669] border border-[#059669]/20 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
              Habilitado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
              Inhabilitado
            </span>
          )}
        </div>
      </div>

      {/* Ambiente del Examen */}
      <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs mt-1">
        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
            AMBIENTE DEL EXAMEN
          </p>
        </div>
        <p className="text-sm md:text-base font-bold text-slate-900">
          {examen.ambiente}
        </p>
      </div>

      {/* Panel de Validación de Identidad y Elegibilidad de Ingreso */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
        <div className="flex items-center gap-2 text-slate-700">
          <ShieldCheck className="h-4 w-4 text-[#002D62]" />
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Verificación de identidad para ingreso
          </h5>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
            <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Nómina del examen</span>
              <span className="font-semibold text-slate-800">Inscrito en la materia</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Marcación previa</span>
              <span className="font-semibold text-slate-800">
                {estudiante.yaIngreso ? "Ya registrado" : "Sin ingreso previo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error de Red o Envío */}
      {errorEnvio && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {errorEnvio}
        </div>
      )}

      {/* Botones de Acción (Adaptativo: Desktop en fila derecha, Mobile en columna según mockup) */}
      <div className="pt-3 border-t border-slate-100 mt-1">
        {/* Versión Desktop (>= md) */}
        <div className="hidden md:flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirmar}
            className="px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            {isSubmitting ? "Confirmando ingreso..." : "Confirmar ingreso"}
          </button>
        </div>

        {/* Versión Mobile (< md) según Mockup media_1791763180977.jpg */}
        <div className="flex md:hidden flex-col gap-2.5 w-full">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirmar}
            className="w-full py-3 bg-[#002D62] hover:bg-[#001D42] text-white text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            {isSubmitting ? "Confirmando ingreso..." : "Confirmar ingreso"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="w-full py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
