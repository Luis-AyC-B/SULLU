"use client";
import { useState } from "react";
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
    } = useExamenes();
    const {
        estudiantesFiltrados,
        totalEstudiantes,
        totalHabilitados,
        isLoading,
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
    const handleConfirmInhabilitar = async (estudianteId: number, motivo?: string) => {
        await inhabilitarEstudiante(estudianteId, motivo);
    };
    return (
        <Can permission="estudiantes.ver">
            <div className="space-y-6">
                {/* Barra superior de título y acciones (Importar más, Añadir estudiante) */}
                <EstudiantesActionsBar
                    onImportClick={() => setUploadModalOpen(true)}
                    onAddClick={() => setAddModalOpen(true)}
                />
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
                {totalEstudiantes === 0 && !isLoading ? (
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
                            isLoading={isLoading}
                            onInhabilitarClick={handleInhabilitarClick}
                            onHabilitarClick={handleHabilitarClick}
                        />
                    </div>
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