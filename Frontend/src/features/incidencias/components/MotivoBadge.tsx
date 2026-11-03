import { getMotivoLabel } from "../types/incidencias.types";

interface MotivoBadgeProps {
  motivo: string;
}

export function MotivoBadge({ motivo }: MotivoBadgeProps) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-label text-destructive">
      {getMotivoLabel(motivo)}
    </span>
  );
}
