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
    materias,
    ambientes,
    filters,
    setFilters,
    createExam,
    updateExam,
    cancelExam,
    isLoading,
  } = useExams();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Estados independientes para el flujo de edición
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);
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
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Error al crear examen:", err);
    }
  };

  // 1. Al presionar el lápiz: abre el formulario de edición
  const handleStartEdit = (exam: Exam) => {
    setExamToEdit(exam);
    setPendingEditValues(null);
    setIsConfirmEditOpen(false);
    setIsEditModalOpen(true);
  };

  // 2. Al enviar el formulario: abrimos la confirmación
  const handleEditFormSubmit = (values: ExamFormValues) => {
    setPendingEditValues(values);
    setIsEditModalOpen(false);
    setIsConfirmEditOpen(true);
  };

  // 3. Cerrar el modal de edición
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  // 4. Cerrar o cancelar la confirmación
  const handleCloseConfirmModal = () => {
    setIsConfirmEditOpen(false);
    setPendingEditValues(null);
    setExamToEdit(null);
  };

  // 5. Al presionar "Confirmar" en la ventana de confirmación: guardamos en el Backend
  const handleConfirmEdit = async () => {
    if (!examToEdit || !pendingEditValues) {
      console.warn("Faltan datos para editar:", { examToEdit, pendingEditValues });
      return;
    }
    try {
      await updateExam(examToEdit.id, pendingEditValues);
      setIsConfirmEditOpen(false);
      setPendingEditValues(null);
      setExamToEdit(null);
    } catch (err) {
      console.error("Error al actualizar examen:", err);
    }
  };

  // Cancelar o desactivar examen
  const handleConfirmCancel = async (examId: string, hardDelete: boolean) => {
    try {
      await cancelExam(examId, hardDelete);
      setExamToCancel(null);
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
                onEdit={handleStartEdit}
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

      {/* Modal de Edición (Formulario) */}
      <ExamFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleEditFormSubmit}
        initialData={examToEdit}
        materias={materias}
        ambientes={ambientes}
      />

      {/* Modal de Confirmación de Edición */}
      {isConfirmEditOpen && examToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2 text-[#003770]">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">Confirmar Edición</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseConfirmModal}
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
                onClick={() => {
                  // Volver al formulario de edición
                  setIsConfirmEditOpen(false);
                  setIsEditModalOpen(true);
                }}
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