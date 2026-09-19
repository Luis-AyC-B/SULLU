"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Exam } from "../types/exam.types";

interface CancelExamDialogProps {
  isOpen: boolean;
  exam: Exam | null;
  onClose: () => void;
  onConfirm: (examId: string, hardDelete: boolean) => void;
}

export function CancelExamDialog({
  isOpen,
  exam,
  onClose,
  onConfirm,
}: CancelExamDialogProps) {
  if (!isOpen || !exam) return null;

  // Calcular horas transcurridas desde su creación
  const getHoursSinceCreation = (): number => {
    try {
      const createdTime = new Date(exam.createdAt).getTime();
      const now = new Date().getTime();
      const diffMs = now - createdTime;
      return diffMs / (1000 * 60 * 60);
    } catch {
      return 0;
    }
  };

  const hoursSinceCreation = getHoursSinceCreation();
  // Si fue creado hace menos de 24 horas => hard delete (Cancelación / Eliminación física)
  // Si fue creado hace 24 horas o más => soft delete (Desactivación / Baja lógica)
  const isHardDelete = hoursSinceCreation < 24;

  const handleConfirm = () => {
    onConfirm(exam.id, isHardDelete);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-base font-bold text-gray-900">
              {isHardDelete ? "Cancelar Examen" : "Desactivar Examen"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <p className="text-sm text-gray-600">
            {isHardDelete
              ? "¿Estás seguro de que deseas cancelar el examen de "
              : "¿Estás seguro de que deseas desactivar el examen de "}
            <span className="font-bold text-gray-900">
              {exam.materiaNombre} ({exam.tipoExamen})
            </span>
            ?
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer ${
              isHardDelete
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-800 hover:bg-gray-900"
            }`}
          >
            {isHardDelete ? "Confirmar Cancelación" : "Confirmar Desactivación"}
          </button>
        </div>
      </div>
    </div>
  );
}
