"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { labelExamen, type ExamenIncidencia } from "../types/incidencias.types";

interface ExamenSelectProps {
  id: string;
  examenes: ExamenIncidencia[];
  value: string;
  onChange: (examenId: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// Se usa en la pantalla de listado y en el modal "Registrar incidencia".
export function ExamenSelect({
  id,
  examenes,
  value,
  onChange,
  disabled,
  error,
  className,
}: ExamenSelectProps) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-label">
        Examen
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
          className="w-full bg-card data-[size=default]:h-11"
        >
          <SelectValue placeholder="Selecciona un examen" />
        </SelectTrigger>
        <SelectContent>
          {examenes.map((examen) => (
            <SelectItem key={examen.id} value={examen.id}>
              {labelExamen(examen)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="text-label text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}