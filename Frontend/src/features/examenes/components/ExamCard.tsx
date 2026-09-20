"use client";

import { Edit3, GraduationCap } from "lucide-react";
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
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const isInactive = exam.estado === "Finalizado" || exam.estado === "Desactivado";

  // Regla de 24 horas DESDE SU CREACIÓN:
  // Si fue creado hace menos de 24 horas => "Cancelar" (eliminación física)
  // Si pasaron 24 horas o más desde su creación => "Desactivar" (baja lógica)
  const isCreatedUnder24Hours = (): boolean => {
    try {
      const createdTime = new Date(exam.createdAt).getTime();
      const now = new Date().getTime();
      const diffHours = (now - createdTime) / (1000 * 60 * 60);
      return diffHours < 24;
    } catch {
      return true;
    }
  };

  const isUnder24 = isCreatedUnder24Hours();
  const actionLabel = isUnder24 ? "Cancelar" : "Desactivar";

  // Formatear la fecha a dd/mm/aaaa
  const formatDateSlash = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("-")) return dateStr;
    const [yyyy, mm, dd] = dateStr.split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between">
      <div>
        {/* Encabezado: Estado + Badge Editado + Botón Editar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 1. Badge de Estado (Programado, En curso, Finalizado, etc.) */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-xs font-semibold border ${getBadgeStyle(
                exam.estado
              )}`}
            >
              {exam.estado}
            </span>

            {/* 2. Badge gris de Editado al lado del estado */}
            {(exam.fueEditado || exam.isEdited) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Editado
              </span>
            )}
          </div>

          {/* Botón de Editar (Lápiz) */}
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

        {/* Carrera */}
        <p className="mt-3 text-xs font-medium text-gray-400">
          {exam.carreraNombre}
        </p>

        {/* Materia y Tipo de Examen */}
        <h3 className="text-base font-bold text-[#1A1D23] mt-0.5">
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

      {/* Pie de tarjeta: Cantidad de habilitados + Botón Cancelar / Desactivar */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
          <GraduationCap className="h-4 w-4 text-gray-400" />
          <span>{exam.habilitadosCount} habilitados</span>
        </div>

        {canCancel && !isInactive && (
          <button
            type="button"
            onClick={() => onCancel?.(exam)}
            className="text-gray-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}