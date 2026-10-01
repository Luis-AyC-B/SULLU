"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, AlertCircle, ShieldAlert } from "lucide-react";
import { useHasPermission } from "@/shared/hooks/useHasPermission";
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
  // 1. Permisos del usuario actual (llamados incondicionalmente a nivel superior)
  const canVer = useHasPermission("estudiantes.ver");
  const hasPermCargar = useHasPermission("estudiantes.cargar");
  const hasPermMasivo = useHasPermission("estudiantes.masivo");
  const hasPermRegistrar = useHasPermission("estudiantes.registrar");
  const hasPermAgregar = useHasPermission("estudiantes.agregar");
  const hasPermCrear = useHasPermission("estudiantes.crear");
  const canHabilitar = useHasPermission("estudiantes.habilitar");

  const canSubirCsv = hasPermCargar || hasPermMasivo || hasPermRegistrar;
  const canAgregarManual = hasPermAgregar || hasPermCrear || hasPermRegistrar;

  // 2. Estado de Exámenes
  const {
    examenes,
    selectedExamenId,
    setSelectedExamenId,
    selectedExamen,
    isLoading: isLoadingExamenes,
  } = useExamenes();

  // 3. Estado de Estudiantes del examen seleccionado
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

  // 4. Modales
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

  // Regla: Solo mientras esté CANCELADO o FINALIZADO no puede editar la lista
  const estadoExamen = (selectedExamen?.estado || "").toUpperCase();
  const isExamenBloqueado =
    selectedExamen?.esBloqueado ??
    (estadoExamen === "FINALIZADO" || estadoExamen === "CANCELADO");

  const permiteSubirCsv = !isExamenBloqueado && canSubirCsv;
  const permiteAgregarManual = !isExamenBloqueado && canAgregarManual;
  const permiteHabilitar = !isExamenBloqueado && canHabilitar;

  const hasExamenes = examenes.length > 0;

  // Si el usuario no tiene permiso de ver estudiantes
  if (!canVer) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-8 sm:p-14 text-center shadow-2xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
          Acceso no autorizado
        </h2>
        <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-slate-500 leading-relaxed">
          No cuentas con los permisos requeridos para visualizar la lista de estudiantes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra superior de título y acciones (Importar más, Añadir estudiante) */}
      <EstudiantesActionsBar
        onImportClick={() => setUploadModalOpen(true)}
        onAddClick={() => setAddModalOpen(true)}
        canSubirCsv={permiteSubirCsv}
        canAgregarManual={permiteAgregarManual}
      />

      {/* Estado: La base de datos no tiene exámenes registrados */}
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#002D62] px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-2xs hover:bg-[#00224d] transition-colors cursor-pointer"
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

          {/* Aviso: Examen Finalizado o Cancelado (Solo lectura) */}
          {isExamenBloqueado && selectedExamen && (
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm ${
                estadoExamen === "CANCELADO"
                  ? "border-rose-200 bg-rose-50/90 text-rose-900"
                  : "border-amber-200 bg-amber-50/90 text-amber-900"
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 shrink-0 ${
                  estadoExamen === "CANCELADO"
                    ? "text-rose-600"
                    : "text-amber-600"
                }`}
              />
              <p>
                <span className="font-bold">
                  {estadoExamen === "CANCELADO"
                    ? "Examen cancelado:"
                    : "Examen finalizado:"}
                </span>{" "}
                Este examen se encuentra en estado{" "}
                <span className="font-semibold">
                  {estadoExamen || "FINALIZADO"}
                </span>
                . La lista de estudiantes y los estados de habilitación se
                encuentran en modo solo lectura y no pueden modificarse.
              </p>
            </div>
          )}

          {/* Banner de resultado de la última carga de CSV */}
          {resultadoCarga && (
            <UploadResultBanner
              resultado={resultadoCarga}
              onDismiss={() => setResultadoCarga(null)}
            />
          )}

          {/* Contenido principal: Lista vacía O Tabla con estudiantes */}
          {totalEstudiantes === 0 && !isLoadingEstudiantes ? (
            <EstudiantesEmptyState
              onFileSelect={procesarArchivoCsv}
              onAddManualClick={() => setAddModalOpen(true)}
              isSubmitting={isSubmitting}
              canSubirCsv={permiteSubirCsv}
              canAgregarManual={permiteAgregarManual}
              isExamenPasado={isExamenBloqueado}
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
                canHabilitar={permiteHabilitar}
                onInhabilitarClick={handleInhabilitarClick}
                onHabilitarClick={handleHabilitarClick}
              />
            </div>
          )}
        </>
      )}

      {/* Modal: Añadir estudiante manualmente */}
      {permiteAgregarManual && (
        <AddEstudianteModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSubmit={addEstudianteManual}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Modal: Importar archivo CSV */}
      {permiteSubirCsv && (
        <UploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onFileSelect={procesarArchivoCsv}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Dialog: Confirmación de inhabilitación con motivo */}
      {permiteHabilitar && (
        <InhabilitarDialog
          open={!!inhabilitarTarget}
          onOpenChange={(open) => !open && setInhabilitarTarget(null)}
          estudiante={inhabilitarTarget}
          onConfirm={handleConfirmInhabilitar}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}