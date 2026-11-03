"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, RefreshCw, ShieldAlert } from "lucide-react";
import { useDashboardAsistencia } from "@/features/examenes/hooks/useDashboardAsistencia";
import {
  AttendanceHeaderCard,
  AttendanceMetricCard,
  AttendanceProgressBar,
  AttendanceVariantesNote,
  AttendanceEmptyAlert,
  AttendanceErrorBanner,
} from "@/features/examenes/components/asistencia";

export default function AsistenciaExamenPage() {
  const params = useParams();
  const rawId = params?.id;
  const examId = Array.isArray(rawId) ? rawId[0] : rawId || "";

  const {
    data,
    isLoading,
    isRefreshing,
    error,
    isForbidden,
    isNotFound,
    lastUpdatedLabel,
    refrescar,
  } = useDashboardAsistencia(examId);

  // Estado de Acceso No Autorizado (Criterio 14 / EN3: 403 Forbidden)
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 md:p-14 text-center mt-6">
        <div className="rounded-full bg-red-100 p-4 text-red-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Acceso No Autorizado</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md">
          Solo el docente responsable de este examen o un administrador tienen autorización para consultar este dashboard de asistencia.
        </p>
        <Link
          href="/examenes"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Exámenes
        </Link>
      </div>
    );
  }

  // Estado de Examen no Encontrado (404)
  if (isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 md:p-14 text-center mt-6">
        <h2 className="text-xl font-bold text-gray-900">Examen no localizado</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md">
          El examen solicitado no existe o fue eliminado del sistema.
        </p>
        <Link
          href="/examenes"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Exámenes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Barra de Navegación y Encabezado Principal */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb Desktop */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Link href="/examenes" className="hover:text-blue-600 transition-colors">
            Exámenes
          </Link>
          <span>›</span>
          <span className="text-gray-700 truncate max-w-md font-semibold">
            {data ? `${data.materia} – ${data.tipoExamen}` : "Cargando..."}
          </span>
        </div>

        {/* Breadcrumb Mobile (‹ Exámenes) */}
        <div className="md:hidden">
          <Link
            href="/examenes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-950 hover:text-blue-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Exámenes</span>
          </Link>
        </div>

        {/* Título y Botón Refrescar (Desktop) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">
            Asistencia del examen
          </h1>

          {/* Botón Refrescar (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={refrescar}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              title="Refrescar métricas de asistencia"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-gray-600 ${
                  isRefreshing ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span>Refrescar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Estado de Carga Inicial (Skeleton) */}
      {isLoading && !data && (
        <div className="space-y-5 animate-pulse">
          <div className="h-28 rounded-xl bg-gray-100 border border-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="h-28 rounded-xl bg-gray-100 border border-gray-200" />
            <div className="h-28 rounded-xl bg-gray-100 border border-gray-200" />
            <div className="h-28 rounded-xl bg-gray-100 border border-gray-200" />
          </div>
          <div className="h-28 rounded-xl bg-gray-100 border border-gray-200" />
        </div>
      )}

      {/* 3. Contenido Principal */}
      {data && (
        <>
          {/* Card de Cabecera con Metadatos del Examen */}
          <AttendanceHeaderCard
            data={data}
            lastUpdatedLabel={lastUpdatedLabel}
            isRefreshing={isRefreshing}
            onRefresh={refrescar}
          />

          {/* Fila secundaria en Mobile: Tiempo relativo a la izquierda, Botón Refrescar a la derecha */}
          <div className="flex md:hidden items-center justify-between pt-1">
            <span className="text-xs text-gray-500 font-medium">
              {lastUpdatedLabel}
            </span>
            <button
              type="button"
              onClick={refrescar}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-gray-600 ${
                  isRefreshing ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span>Refrescar</span>
            </button>
          </div>

          {/* Banner de Error (conservando las cifras anteriores si falla la red) */}
          {error && (
            <AttendanceErrorBanner
              message={error}
              onRetry={refrescar}
              isRetrying={isRefreshing}
            />
          )}

          {/* Estado Vacío: Si hay 0 habilitados (Criterio 4) */}
          {data.habilitados === 0 && <AttendanceEmptyAlert />}

          {/* Grid de Métricas Principales (3 Columnas en Desktop, 1 Columna en Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Habilitados */}
            <AttendanceMetricCard
              variant="habilitados"
              label="Habilitados"
              value={data.habilitados}
              percentage={data.habilitados > 0 ? 100 : 0}
            />

            {/* Presentes */}
            <AttendanceMetricCard
              variant="presentes"
              label="Presentes"
              value={data.presentes}
              percentage={data.porcentajePresentes}
            />

            {/* Ausentes (Respeta la regla de si aún no inicia) */}
            <AttendanceMetricCard
              variant="ausentes"
              label="Ausentes"
              value={data.ausentes}
              percentage={data.porcentajeAusentes}
              isNotStarted={data.examenAunNoInicia}
              notStartedText="El examen aún no inicia"
            />
          </div>

          {/* Barra de Progreso de Asistencia */}
          <AttendanceProgressBar
            presentes={data.presentes}
            habilitados={data.habilitados}
            porcentajePresentes={data.porcentajePresentes}
          />

          {/* Nota de Variantes Informativa (Mockup) */}
          <AttendanceVariantesNote />
        </>
      )}
    </div>
  );
}
