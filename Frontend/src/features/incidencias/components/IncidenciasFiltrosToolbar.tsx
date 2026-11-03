// src/features/incidencias/components/IncidenciasFiltrosToolbar.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  MOTIVOS_FILTRO_OPCIONES,
  labelExamen,
  type ExamenIncidencia,
} from "../types/incidencias.types";

interface IncidenciasFiltrosToolbarProps {
  examenes: ExamenIncidencia[];
  examenId: string | null;
  onExamenChange: (examenId: string) => void;
  motivoSeleccionado: string;
  onMotivoChange: (motivo: string) => void;
  disabled?: boolean;
}

export function IncidenciasFiltrosToolbar({
  examenes,
  examenId,
  onExamenChange,
  motivoSeleccionado,
  onMotivoChange,
  disabled = false,
}: IncidenciasFiltrosToolbarProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Selector 1: Materia (Examen) */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filtro-materia-select"
          className="text-sm font-medium text-foreground"
        >
          Materia
        </label>
        <Select
          value={examenId ?? undefined}
          onValueChange={onExamenChange}
          disabled={disabled || examenes.length === 0}
        >
          <SelectTrigger
            id="filtro-materia-select"
            className="w-full bg-card data-[size=default]:h-11 px-3 text-base"
          >
            <SelectValue
              placeholder={
                examenes.length === 0
                  ? "No hay materias disponibles"
                  : "Selecciona una materia"
              }
            />
          </SelectTrigger>
          <SelectContent position="popper">
            {examenes.map((examen) => (
              <SelectItem key={examen.id} value={examen.id}>
                {labelExamen(examen)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector 2: Motivo */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filtro-motivo-select"
          className="text-sm font-medium text-foreground"
        >
          Motivo
        </label>
        <Select
          value={motivoSeleccionado}
          onValueChange={onMotivoChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="filtro-motivo-select"
            className="w-full bg-card data-[size=default]:h-11 px-3 text-base"
          >
            <SelectValue placeholder="Todos los motivos" />
          </SelectTrigger>
          <SelectContent position="popper">
            {MOTIVOS_FILTRO_OPCIONES.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
