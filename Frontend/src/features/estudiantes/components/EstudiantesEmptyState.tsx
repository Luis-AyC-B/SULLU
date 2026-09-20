"use client";

import { useRef, useState } from "react";
import { UploadCloud, Plus } from "lucide-react";
import { Can } from "@/shared/components/guards/Can";

interface EstudiantesEmptyStateProps {
  onFileSelect: (file: File) => void;
  onAddManualClick: () => void;
  isSubmitting?: boolean;
}

export function EstudiantesEmptyState({
  onFileSelect,
  onAddManualClick,
  isSubmitting = false,
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

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-2xs">
      <div className="mx-auto max-w-2xl flex flex-col items-center">
        {/* Zona de Arrastrar y Soltar / Clic (protegida con permiso estudiantes.registrar) */}
        <Can
          permission="estudiantes.registrar"
          fallback={
            <div className="w-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <p className="text-sm text-slate-500 font-medium">
                No tienes permisos para registrar o subir estudiantes a este examen.
              </p>
            </div>
          }
        >
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
        </Can>

        {/* Separador "o si prefieres" y Añadir manual */}
        <Can permission="estudiantes.registrar">
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
        </Can>

        {/* Cuadro de Formato esperado del CSV */}
        <div className="mt-8 w-full rounded-xl border border-slate-200/80 bg-[#F4F6F8] p-5">
          <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-2.5">
            Formato esperado del CSV
          </h4>
          <div className="font-mono text-xs text-slate-600 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-200/50 overflow-x-auto">
            <p className="font-semibold text-slate-800">nombre,apellido,codigo,ci</p>
            <p>Ana,Torres,2021-10001,8912345</p>
            <p>Carlos,Pérez,2022-11002,7812903</p>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            * Cada fila debe contener el nombre, apellido y código SIS único del estudiante. El CI es opcional.
          </p>
        </div>
      </div>
    </div>
  );
}