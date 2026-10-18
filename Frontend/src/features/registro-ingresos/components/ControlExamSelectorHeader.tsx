// src/features/registro-ingresos/components/ControlExamSelectorHeader.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EnVivoBadge } from "./EnVivoBadge";
import {
  labelExamen,
  type EstadoConexion,
  type ExamenControl,
} from "../types/ingresos.types";

interface ControlExamSelectorHeaderProps {
  examenes: ExamenControl[];
  examenId: string | null;
  onExamenChange: (examenId: string) => void;
  ingresados?: number;
  total?: number;
  conexion: EstadoConexion;
  isLoading?: boolean;
  /** Si es false, el contenedor coloca el badge por su cuenta. */
  showBadge?: boolean;
}

export function ControlExamSelectorHeader({
  examenes,
  examenId,
  onExamenChange,
  ingresados,
  total,
  conexion,
  isLoading = false,
  showBadge = true,
}: ControlExamSelectorHeaderProps) {
  const sinExamenes = !isLoading && examenes.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {showBadge && (
        <div className="flex sm:justify-end">
          <EnVivoBadge
            conexion={conexion}
            ingresados={ingresados}
            total={total}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="examen-select" className="text-sm font-medium text-foreground">
          Examen
        </label>
        <Select
          value={examenId ?? undefined}
          onValueChange={onExamenChange}
          disabled={isLoading || sinExamenes}
        >
          <SelectTrigger
            id="examen-select"
            className="w-full bg-card data-[size=default]:h-11 px-3 text-base"
          >
            <SelectValue
              placeholder={
                isLoading
                  ? "Cargando exámenes..."
                  : sinExamenes
                    ? "No hay exámenes disponibles"
                    : "Selecciona un examen"
              }
            />
          </SelectTrigger>
          <SelectContent position="popper">
            {examenes.map((examen) => (
              <SelectItem key={examen.id} value={String(examen.id)}>
                {labelExamen(examen)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}