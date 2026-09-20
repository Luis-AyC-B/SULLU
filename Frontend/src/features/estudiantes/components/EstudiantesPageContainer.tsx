"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Can } from "@/shared/components/guards/Can";
import { useExamenes } from "../hooks/useExamenes";
import { useEstudiantes } from "../hooks/useEstudiantes";
import { EstudianteExamen } from "../types/estudiante.types";
import { EstudiantesActionsBar } from "./EstudiantesActionsBar";
import { ExamenSelector } from "./ExamenSelector";
import { EstudiantesToolbar } from "./EstudiantesToolbar";
import { EstudiantesTable } from "./EstudiantesTable";
import { EstudiantesEmptyState } from "./EstudiantesEmptyState";
import { AddEstudianteModal } from "./AddEstudianteModal";
import { InhabilitarDialog } from "./InhabilitarDialog";
import { UploadModal } from "./UploadModal";
import { UploadResultBanner } from "./UploadResultBanner";

export function EstudiantesPageContainer() {
  const {
    examenes,
    selectedExamenId,
    setSelectedExamenId,
    isLoading: isLoadingExamenes,
  } = useExamenes();

  const {
    estudiantesFiltrados,
    totalEstudiantes,
    totalHabilitados,
    isLoading: isLoadingEstudiantes,
    isSubmitting,
    searchTerm,
    setSearchTerm,
    filtroEstado,
    setFiltroEstado,
    resultadoCarga,
    setResultadoCarga,
    inhabilitarEstudiante,
    habilitarEstudiante,
    addEstudianteManual,
    procesarArchivoCsv,
  } = useEstudiantes(selectedExamenId);

  // Modales
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [inhabilitarTarget, setInhabilitarTarget] = useState<EstudianteExamen | null>(null);

  const handleInhabilitarClick = (estudiante: EstudianteExamen) => {
    setInhabilitarTarget(estudiante);
  };

  const handleHabilitarClick = async (estudiante: EstudianteExamen) => {
    await habilitarEstudiante(estudiante.estudiante_id);
  };

  const handleConfirmInhabilitar = async (estudianteId: number, motivo: string) => {
    await inhabilitarEstudiante(estudianteId, motivo);
  };

  const hasExamenes = examenes.length > 0;

  return (
    <Can permission="estudiantes.ver">
      <div className="space-y-6">
        {/* Barra superior de título y acciones (Importar más, Añadir estudiante) */}
        <EstudiantesActionsBar
          onImportClick={() => setUploadModalOpen(true)}
          onAddClick={() => setAddModalOpen(true)}
          hasExamenes={hasExamenes}
        />

        {/* Estado 1: La base de datos no tiene exámenes registrados */}
        {!isLoadingExamenes && !hasExamenes ? (
          <div className="rounded-xl border border-slate-200/90 bg-white p-8 sm:p-14 text-center shadow-2xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4">
              <ClipboardCheck className="h-7 w-7 text-[#002D62]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              No tienes exámenes registrados
            </h2>
            <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-slate-500 leading-relaxed">
              Para gestionar listas de estudiantes y registrar asistencias, primero debes crear y programar un examen en el sistema.
            </p>
            <div className="mt-6">
              <Link
                href="/examenes"
                className="inline-flex items-center gap-2 rounded-lg bg-[#002D62] px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-2xs hover:bg-[#00224d] transition-colors"
              >
                <ClipboardCheck className="h-4 w-4" />
                <span>Ir al módulo de Exámenes</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tarjeta de selección de examen y contadores TOTAL / HABILITADOS */}
            <ExamenSelector
              examenes={examenes}
              selectedExamenId={selectedExamenId}
              onSelectExamen={setSelectedExamenId}
              totalEstudiantes={totalEstudiantes}
              totalHabilitados={totalHabilitados}
            />

            {/* Banner de resultado de la última carga de CSV */}
            {resultadoCarga && (
              <UploadResultBanner
                resultado={resultadoCarga}
                onDismiss={() => setResultadoCarga(null)}
              />
            )}

            {/* Contenido principal: Lista vacía con Dropzone O Tabla con estudiantes */}
            {totalEstudiantes === 0 && !isLoadingEstudiantes ? (
              <EstudiantesEmptyState
                onFileSelect={procesarArchivoCsv}
                onAddManualClick={() => setAddModalOpen(true)}
                isSubmitting={isSubmitting}
              />
            ) : (
              <div className="space-y-4">
                {/* Buscador y filtro por estado */}
                <EstudiantesToolbar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filtroEstado={filtroEstado}
                  onFiltroEstadoChange={setFiltroEstado}
                />

                {/* Tabla de estudiantes (Desktop) y Tarjetas (Mobile) */}
                <EstudiantesTable
                  estudiantes={estudiantesFiltrados}
                  isLoading={isLoadingEstudiantes}
                  onInhabilitarClick={handleInhabilitarClick}
                  onHabilitarClick={handleHabilitarClick}
                />
              </div>
            )}
          </>
        )}

        {/* Modal: Añadir estudiante manualmente */}
        <AddEstudianteModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSubmit={addEstudianteManual}
          isSubmitting={isSubmitting}
        />

        {/* Modal: Importar archivo CSV / XLSX */}
        <UploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onFileSelect={procesarArchivoCsv}
          isSubmitting={isSubmitting}
        />

        {/* Dialog: Confirmación de inhabilitación con motivo */}
        <InhabilitarDialog
          open={!!inhabilitarTarget}
          onOpenChange={(open) => !open && setInhabilitarTarget(null)}
          estudiante={inhabilitarTarget}
          onConfirm={handleConfirmInhabilitar}
          isSubmitting={isSubmitting}
        />
      </div>
    </Can>
  );
}