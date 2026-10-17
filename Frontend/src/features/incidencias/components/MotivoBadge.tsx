import {
  MOTIVO_LABEL,
  type MotivoIncidencia,
} from "../types/incidencias.types";

interface MotivoBadgeProps {
  motivo: MotivoIncidencia;
}

export function MotivoBadge({ motivo }: MotivoBadgeProps) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-label text-destructive">
      {MOTIVO_LABEL[motivo]}
    </span>
  );
}