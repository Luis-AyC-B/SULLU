"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Edit3 } from "lucide-react";
import { Exam } from "../types/exam.types";

interface ExamCardProps {
  exam: Exam;
  onEdit?: (exam: Exam) => void;
  onCancel?: (exam: Exam) => void;
  canEdit?: boolean;
  canCancel?: boolean;
}

export function ExamCard({
  exam,
  onEdit,
  onCancel,
  canEdit = true,
  canCancel = true,
}: ExamCardProps) {
  const router = useRouter();

  // Configuración de colores de badges
  const getBadgeStyle = (estado: Exam["estado"]) => {
    switch (estado) {
      case "En curso":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Programado":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "Finalizado":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "Desactivado":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const isInactive = exam.estado === "Finalizado" || exam.estado === "Desactivado";

  // Regla de 24 horas DESDE SU CREACIÓN:
  const isCreatedUnder24Hours = (): boolean => {
    if (!exam.createdAt) return true;
    const createdTime = new Date(exam.createdAt).getTime();
    if (isNaN(createdTime)) return true;
    const now = new Date().getTime();
    const diffHours = (now - createdTime) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours < 24;
  };

  const isUnder24 = isCreatedUnder24Hours();
  const actionLabel = isUnder24 ? "Cancelar" : "Desactivar";

  // Formatear cualquier formato de fecha a dd/mm/aaaa
  const formatDateSlash = (dateStr: string) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [yyyy, mm, dd] = dateStr.substring(0, 10).split("-");
      return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return dateStr;
  };

  // Navegar al dashboard de asistencia de este examen
  const handleCardClick = () => {
    router.push(`/examenes/${exam.id}/asistencia`);
  };

  // Determinar si los ausentes deben mostrarse con guion (aún no inicia)
  const isAunNoInicia =
    exam.ausentesCount === null ||
    exam.ausentesCount === undefined ||
    exam.estado === "Programado";

  return (
    <div
      onClick={handleCardClick}
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-200 flex flex-col justify-between cursor-pointer"
      role="article"
      aria-label={`Examen ${exam.materiaNombre} ${exam.tipoExamen}`}
    >
      <div>
        {/* Encabezado: Estado + Badge Editado + Acciones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 1. Badge de Estado (Programado, En curso, Desactivado, Finalizado) */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-xs font-semibold border ${getBadgeStyle(
                exam.estado
              )}`}
            >
              {exam.estado}
            </span>

            {/* 2. Badge gris de Editado: SOLO si el examen está activo */}
            {(exam.fueEditado || exam.isEdited) && !isInactive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Editado
              </span>
            )}
          </div>

          {/* Acciones de gestión (Editar / Cancelar / Desactivar) */}
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {canCancel && !isInactive && (
              <button
                type="button"
                onClick={() => onCancel?.(exam)}
                className="text-xs text-gray-400 hover:text-red-600 font-medium transition-colors cursor-pointer mr-1"
                title={`${actionLabel} examen`}
              >
                {actionLabel}
              </button>
            )}

            {canEdit && !isInactive && (
              <button
                type="button"
                onClick={() => onEdit?.(exam)}
                className="text-gray-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                title="Editar examen"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Carrera */}
        <p className="mt-3 text-xs font-medium text-gray-400">
          {exam.carreraNombre}
        </p>

        {/* Materia y Tipo de Examen */}
        <h3 className="text-base font-bold text-[#1A1D23] mt-0.5 group-hover:text-blue-900 transition-colors">
          {exam.materiaNombre} – {exam.tipoExamen}
        </h3>

        {/* Datos del Examen: Ambiente, Fecha y Hora */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-b border-gray-100 pb-4 text-xs">
          <div className="min-w-0">
            <span className="text-gray-400 block font-medium">Ambiente</span>
            <span
              className="text-gray-800 font-semibold mt-0.5 block truncate"
              title={exam.ambienteNombre}
            >
              {exam.ambienteNombre}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Fecha</span>
            <span className="text-gray-800 font-semibold mt-0.5 block whitespace-nowrap">
              {formatDateSlash(exam.fecha)}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Hora</span>
            <span
              className="text-gray-800 font-semibold mt-0.5 block whitespace-nowrap"
              title={`${exam.horaInicio} ${exam.horaFin ? `- ${exam.horaFin}` : ""}`}
            >
              {exam.horaInicio} {exam.horaFin ? `- ${exam.horaFin}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Pie de tarjeta HU16: Métricas agregadas (Habilitados, Presentes, Ausentes) */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-left">
        {/* Habilitados */}
        <div className="rounded-xl bg-[#F8FAFC] p-2.5 sm:p-3">
          <span className="block text-[11px] sm:text-xs text-gray-500 font-medium">
            Habilitados
          </span>
          <span className="block text-lg sm:text-xl font-bold text-[#1E3A8A] mt-0.5">
            {exam.habilitadosCount ?? 0}
          </span>
        </div>

        {/* Presentes */}
        <div className="rounded-xl bg-[#F8FAFC] p-2.5 sm:p-3">
          <span className="block text-[11px] sm:text-xs text-gray-500 font-medium">
            Presentes
          </span>
          <span className="block text-lg sm:text-xl font-bold text-[#0D9488] mt-0.5">
            {exam.presentesCount ?? 0}
          </span>
        </div>

        {/* Ausentes (con guion si aún no inicia según HU16) */}
        <div className="rounded-xl bg-[#F8FAFC] p-2.5 sm:p-3">
          <span className="block text-[11px] sm:text-xs text-gray-500 font-medium">
            Ausentes
          </span>
          <span className="block text-lg sm:text-xl font-bold text-[#C2410C] mt-0.5">
            {isAunNoInicia ? "—" : (exam.ausentesCount ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
