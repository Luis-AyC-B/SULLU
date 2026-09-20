"use client";

import { Upload, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Can } from "@/shared/components/guards/Can";

interface EstudiantesActionsBarProps {
  onImportClick: () => void;
  onAddClick: () => void;
  hasExamenes?: boolean;
}

export function EstudiantesActionsBar({
  onImportClick,
  onAddClick,
  hasExamenes = true,
}: EstudiantesActionsBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Estudiantes
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
          Gestiona la lista de asistencia por examen
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Opción: Importar más (visible únicamente con permiso estudiantes.registrar y si existen exámenes) */}
        {hasExamenes && (
          <Can permission="estudiantes.registrar">
            <Button
              type="button"
              variant="outline"
              onClick={onImportClick}
              className="flex items-center gap-2 border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span>Importar más</span>
            </Button>
          </Can>
        )}

        {/* Opción: Añadir estudiante (visible únicamente con permiso estudiantes.registrar y si existen exámenes) */}
        {hasExamenes && (
          <Can permission="estudiantes.registrar">
            <Button
              type="button"
              onClick={onAddClick}
              className="flex items-center gap-2 bg-[#002D62] px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-2xs hover:bg-[#00224d] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir estudiante</span>
            </Button>
          </Can>
        )}
      </div>
    </div>
  );
}