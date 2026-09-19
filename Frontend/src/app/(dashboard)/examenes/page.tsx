"use client";

import React, { useState } from "react";
import { Plus, BookOpen, Wifi, WifiOff, Database } from "lucide-react";
import { toast, Toaster } from "sonner";
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
    filters,
    setFilters,
    createExam,
    cancelExam,
    isOnline,
    isLoading,
  } = useExams();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [examToCancel, setExamToCancel] = useState<Exam | null>(null);

  // Permisos dinámicos
  const canCreate = true;
  const canEdit = true;
  const canCancel = true;
  const canFilterFacultad = true;
  const canFilterCarrera = true;

  const handleCreateExam = async (values: ExamFormValues) => {
    try {
      const created = await createExam(values);
      toast.success(
        `Examen de ${created.materiaNombre} programado exitosamente.`,
        {
          description: "Guardado de forma segura en la base de datos local (IndexedDB).",
        }
      );
    } catch {
      toast.error("Ocurrió un error al registrar el examen.");
    }
  };

  const handleConfirmCancel = async (examId: string, hardDelete: boolean) => {
    try {
      await cancelExam(examId, hardDelete);
      if (hardDelete) {
        toast.success("Examen cancelado y eliminado definitivamente", {
          description: "El aula y horario han sido liberados del sistema.",
        });
      } else {
        toast.info("Examen desactivado con éxito", {
          description: "Se conservó en el historial con estado Desactivado.",
        });
      }
    } catch {
      toast.error("No se pudo procesar la cancelación.");
    }
  };

  return (
    <PageContainer
      title="Exámenes"
      subtitle="Registro, programación y control de exámenes"
    >
      <Toaster position="top-right" richColors />

      <div className="space-y-6">
     
        {/* Barra superior: Contador y Acciones */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-500">
              {filteredExams.length} {filteredExams.length === 1 ? "examen registrado" : "exámenes registrados"}
            </h2>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a1f44] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#16366f] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nuevo examen
            </button>
          )}
        </div>

        {/* Barra de Filtros Dinámica */}
        <ExamFilterToolbar
          filters={filters}
          onFilterChange={setFilters}
          canFilterFacultad={canFilterFacultad}
          canFilterCarrera={canFilterCarrera}
        />

        {/* Grid de Exámenes */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-xl border border-gray-100 bg-gray-50 animate-pulse p-5"
              />
            ))}
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                canEdit={canEdit}
                canCancel={canCancel}
                onEdit={(e) => {
                  toast.info(`Editar examen: ${e.materiaNombre}`);
                }}
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

      {/* Modal de Creación de Examen */}
      <ExamFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateExam}
      />

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