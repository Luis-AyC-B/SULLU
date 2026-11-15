// src/features/incidencias/components/MotivoBadge.tsx
import { getMotivoLabel } from "../types/incidencias.types";

interface MotivoBadgeProps {
  motivo: string;
}

export function MotivoBadge({ motivo }: MotivoBadgeProps) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
      {getMotivoLabel(motivo)}
    </span>
  );
}
