"use client";

import { useRef, useState } from "react";
import { UploadCloud, Plus, Users, Download } from "lucide-react";
import { descargarPlantillaCsv } from "../utils/csv-template";

interface EstudiantesEmptyStateProps {
  onFileSelect: (file: File) => void;
  onAddManualClick: () => void;
  isSubmitting?: boolean;
  canSubirCsv: boolean;
  canAgregarManual: boolean;
  isExamenPasado?: boolean;
}

export function EstudiantesEmptyState({
  onFileSelect,
  onAddManualClick,
  isSubmitting = false,
  canSubirCsv,
  canAgregarManual,
  isExamenPasado = false,
}: EstudiantesEmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
      e.target.value = "";
    }
  };

  // Caso 1: El usuario NO puede subir masivo ni manual (solo lectura, control de ingreso o examen concluido)
  if (!canSubirCsv && !canAgregarManual) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-8 sm:p-14 text-center shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          No se añadieron estudiantes a este examen
        </h3>
        <p className="mt-1.5 max-w-sm mx-auto text-xs text-slate-500">
          {isExamenPasado
            ? "Este examen ya finalizó y no cuenta con estudiantes registrados."
            : "Actualmente no existen estudiantes registrados ni vinculados para rendir este examen."}
        </p>
      </div>
    );
  }

  // Caso 2: El usuario SOLO puede añadir uno por uno (manual)
  if (!canSubirCsv && canAgregarManual) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-8 sm:p-14 text-center shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          No se añadieron estudiantes a este examen
        </h3>
        <p className="mt-1.5 text-xs text-slate-500">
          Puedes registrar los estudiantes autorizados individualmente.
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={onAddManualClick}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#002D62] px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-2xs hover:bg-[#00224d] transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir estudiante manualmente</span>
          </button>
        </div>
      </div>
    );
  }

  // Caso 3 y 4: Puede subir masivamente (y opcionalmente añadir manual si canAgregarManual es true)
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-2xs">
      <div className="mx-auto max-w-2xl flex flex-col items-center">
        {/* Zona de Arrastrar y Soltar / Clic */}
        <div
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-[#002D62] bg-[#F0F5FA]"
              : "border-slate-200 bg-white hover:border-[#002D62]/50 hover:bg-slate-50/60"
          } ${isSubmitting ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 group-hover:bg-[#EBF1F7] group-hover:text-[#002D62] transition-colors">
            <UploadCloud className="h-6 w-6 text-slate-500 group-hover:text-[#002D62]" />
          </div>

          <h3 className="mt-4 text-sm sm:text-base font-bold text-slate-900">
            {isSubmitting
              ? "Procesando archivo..."
              : "Arrastra el archivo aquí o haz clic"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Formatos aceptados: CSV · máx. 2MB / 5 000 filas
          </p>
        </div>

        {/* Separador "o si prefieres" y Añadir manual si tiene el permiso */}
        {canAgregarManual && (
          <>
            <div className="my-6 flex items-center justify-center w-full">
              <span className="text-xs text-slate-600 font-medium">o si prefieres</span>
            </div>

            <button
              type="button"
              onClick={onAddManualClick}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-[#002D62] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir estudiante manualmente</span>
            </button>
          </>
        )}

        {/* Cuadro de Formato esperado del CSV */}
        <div className="mt-8 w-full rounded-xl border border-slate-200/80 bg-[#F4F6F8] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
            <h4 className="text-xs font-bold text-slate-800 tracking-tight">
              Formato requerido del CSV (1ª fila = encabezados)
            </h4>
            <button
              type="button"
              onClick={descargarPlantillaCsv}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#002D62] hover:underline cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar plantilla CSV</span>
            </button>
          </div>
          <div className="font-mono text-xs text-slate-600 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-200/50 overflow-x-auto">
            <p className="font-semibold text-slate-800">nombre,apellidos,codigo,ci</p>
            <p>Juan,Pérez López,202201234,8912345</p>
            <p>María,González Roca,202105678,</p>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            * Los campos <span className="font-semibold text-slate-800">nombre, apellidos y codigo</span> son obligatorios. El campo <span className="font-semibold text-slate-800">ci</span> es opcional. La primera fila debe ser la cabecera del archivo.
          </p>
        </div>
      </div>
    </div>
  );
}