"use client";

import {
  ChevronLeft,
  Building2,
  AlertTriangle,
  User,
} from "lucide-react";
import type {
  EstudianteBusquedaItem,
  ExamenAsignado,
  MiGrupoControlador,
} from "../../types/control-ingreso.types";

interface ConfirmarIngresoStepProps {
  estudiante: EstudianteBusquedaItem;
  examen: ExamenAsignado;
  onVolver: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
  isSubmitting: boolean;
  errorEnvio: string | null;
  miGrupo?: MiGrupoControlador | null;
  textoVolver?: string;
}

export function ConfirmarIngresoStep({
  estudiante,
  examen,
  onVolver,
  onCancelar,
  onConfirmar,
  isSubmitting,
  errorEnvio,
  miGrupo,
  textoVolver,
}: ConfirmarIngresoStepProps) {
  const nombreCompleto = `${estudiante.nombre} ${
    estudiante.apellido ?? ""
  }`.trim();

  const tieneParticion = Boolean(
    miGrupo && miGrupo.totalEstudiantesGrupo < miGrupo.totalEstudiantesExamen
  );
  const esFueraDeGrupo =
    tieneParticion &&
    !miGrupo?.estudiantes.some(
      (e) => e.id === estudiante.id || e.codSis === estudiante.codSis
    );

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:6002";
  const fotoSrc = estudiante.fotoUrl
    ? estudiante.fotoUrl.startsWith("http") || estudiante.fotoUrl.startsWith("data:")
      ? estudiante.fotoUrl
      : `${backendUrl}${estudiante.fotoUrl.startsWith("/") ? "" : "/"}${estudiante.fotoUrl}`
    : null;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Botón Volver */}
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer self-start -ml-1 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>{textoVolver ?? "Volver a resultados"}</span>
      </button>

      {/* Tarjeta de Identidad Principal con Foto Prioritaria */}
      <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
        {/* Fotografía destacada del estudiante */}
        <div className="relative h-40 w-40 sm:h-48 sm:w-48 shrink-0 overflow-hidden rounded-2xl border-4 border-white shadow-md bg-slate-100 mb-3.5">
          {fotoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoSrc}
              alt={nombreCompleto}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.triedFallback && estudiante.fotoUrl) {
                  target.dataset.triedFallback = "true";
                  const cleanPath = estudiante.fotoUrl.startsWith("http")
                    ? new URL(estudiante.fotoUrl).pathname
                    : estudiante.fotoUrl;
                  target.src = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
                }
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
              <User className="h-16 w-16 text-slate-300 stroke-[1.5]" />
              <span className="text-xs font-semibold text-slate-400 mt-1">Sin fotografía</span>
            </div>
          )}
        </div>

        {/* Badge de Habilitación */}
        <div className="mb-2">
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

        {/* Nombre completo */}
        <h4 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight break-words max-w-full">
          {nombreCompleto}
        </h4>

        {/* SIS y Carnet de Identidad */}
        <p className="text-xs md:text-sm text-slate-500 font-mono mt-1">
          {estudiante.codSis.replace(/-/g, "")}
          {estudiante.ci && ` · ${estudiante.ci}`}
        </p>
      </div>

      {/* Ambiente del Examen */}
      <div className="p-3.5 md:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
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

      {/* HU17: Advertencia clara si el estudiante no pertenece a la fila asignada */}
      {esFueraDeGrupo && miGrupo && (
        <div className="p-3.5 md:p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Estudiante fuera de tu fila asignada ({miGrupo.rango})
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              El estudiante <strong>{nombreCompleto}</strong> no pertenece a tu lista de control. Debe dirigirse con el colaborador asignado a su rango de apellidos.
            </p>
          </div>
        </div>
      )}

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
            disabled={isSubmitting || esFueraDeGrupo}
            onClick={onConfirmar}
            className="px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            {esFueraDeGrupo
              ? "No corresponde a tu fila"
              : isSubmitting
              ? "Confirmando ingreso..."
              : "Confirmar ingreso"}
          </button>
        </div>

        {/* Versión Mobile (< md) según Mockup */}
        <div className="flex md:hidden flex-col gap-2.5 w-full">
          <button
            type="button"
            disabled={isSubmitting || esFueraDeGrupo}
            onClick={onConfirmar}
            className="w-full py-3 bg-[#002D62] hover:bg-[#001D42] text-white text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            {esFueraDeGrupo
              ? "No corresponde a tu fila"
              : isSubmitting
              ? "Confirmando ingreso..."
              : "Confirmar ingreso"}
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
