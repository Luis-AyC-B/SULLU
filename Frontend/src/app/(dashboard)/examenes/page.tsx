"use client";

import React, { useState } from "react";
import { BookOpen, AlertTriangle, X } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { useExams } from "@/features/examenes/hooks/useExams";
import { ExamCard } from "@/features/examenes/components/ExamCard";
import { ExamFilterToolbar } from "@/features/examenes/components/ExamFilterToolbar";
import { ExamFormModal } from "@/features/examenes/components/ExamFormModal";
import { CancelExamDialog } from "@/features/examenes/components/CancelExamDialog";
import { Exam } from "@/features/examenes/types/exam.types";
import { ExamFormValues } from "@/features/examenes/schemas/exam.schema";

export default function ExamenesPage() {
  const {
    filteredExams,
    materias,    // <--- Extraemos materias de useExams
    ambientes,   // <--- Extraemos ambientes de useExams
    filters,
    setFilters,
    createExam,
    updateExam,
    cancelExam,
    isLoading,
  } = useExams();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [pendingEditValues, setPendingEditValues] = useState<ExamFormValues | null>(null);
  const [examToCancel, setExamToCancel] = useState<Exam | null>(null);

  // Permisos dinámicos
  const canCreate = true;
  const canEdit = true;
  const canCancel = true;
  const canFilterFacultad = true;
  const canFilterCarrera = true;

  // Crear nuevo examen
  const handleCreateExam = async (values: ExamFormValues) => {
    try {
      await createExam(values);
    } catch (err) {
      console.error("Error al crear examen:", err);
    }
  };

  // Cuando presiona "Guardar cambios" en el formulario de edición: abre el modal de confirmación
  const handleEditFormSubmit = (values: ExamFormValues) => {
    setPendingEditValues(values);
  };

  // Cuando presiona "Confirmar" en el modal de confirmación de edición
  const handleConfirmEdit = async () => {
    if (examToEdit && pendingEditValues) {
      await updateExam(examToEdit.id, pendingEditValues);
      setPendingEditValues(null);
      setExamToEdit(null);
    }
  };

  // Cancelar o desactivar examen
  const handleConfirmCancel = async (examId: string, hardDelete: boolean) => {
    try {
      await cancelExam(examId, hardDelete);
    } catch (err) {
      console.error("Error al cancelar/desactivar examen:", err);
    }
  };

  return (
    <PageContainer
      title="Exámenes"
      subtitle="Registro, programación y control de exámenes"
      actionLabel={canCreate ? "+ Nuevo examen" : undefined}
      onAction={canCreate ? () => setIsCreateModalOpen(true) : undefined}
    >
      <div className="space-y-6">
        {/* Barra de Filtros Dinámica */}
        <ExamFilterToolbar
          filters={filters}
          onFilterChange={setFilters}
          materias={materias}
          canFilterFacultad={canFilterFacultad}
          canFilterCarrera={canFilterCarrera}
        />

        {/* Grid de Exámenes (Estrictamente 2 Columnas) */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-48 rounded-xl border border-gray-100 bg-gray-50 animate-pulse p-5"
              />
            ))}
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                canEdit={canEdit}
                canCancel={canCancel}
                onEdit={(e) => setExamToEdit(e)}
                onCancel={(e) => setExamToCancel(e)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
            <div className="rounded-full bg-blue-50 p-3 text-blue-600 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              No se encontraron exámenes
            </h3>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              No hay exámenes que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      <ExamFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateExam}
        materias={materias}
        ambientes={ambientes}
      />

      {/* Modal de Edición (se abre al hacer clic en el lápiz) */}
      <ExamFormModal
        isOpen={Boolean(examToEdit) && !pendingEditValues}
        onClose={() => setExamToEdit(null)}
        onSubmit={handleEditFormSubmit}
        initialData={examToEdit}
        materias={materias}
        ambientes={ambientes}
      />

      {/* Modal de Confirmación de Edición */}
      {pendingEditValues && examToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2 text-[#003770]">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">Confirmar Edición</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingEditValues(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que deseas guardar los cambios para el examen de{" "}
                <span className="font-bold text-gray-900">{examToEdit.materiaNombre}</span>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setPendingEditValues(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                className="rounded-lg bg-[#003770] hover:bg-[#002a57] px-5 py-2 text-xs font-medium text-white shadow-xs cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Cancelación / Desactivación */}
      <CancelExamDialog
        isOpen={Boolean(examToCancel)}
        exam={examToCancel}
        onClose={() => setExamToCancel(null)}
        onConfirm={handleConfirmCancel}
      />
    </PageContainer>
  );
}