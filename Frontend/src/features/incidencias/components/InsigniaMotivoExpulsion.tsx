import { cn } from "cn";
import {
  ETIQUETA_MOTIVO_EXPULSION,
  type MotivoExpulsion,
} from "../types/incidencias.types";

interface InsigniaMotivoExpulsionProps {
  motivo: MotivoExpulsion;
  className?: string;
}

export function InsigniaMotivoExpulsion({
  motivo,
  className,
}: InsigniaMotivoExpulsionProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-sm font-medium text-destructive",
        className,
      )}
    >
      {ETIQUETA_MOTIVO_EXPULSION[motivo]}
    </span>
  );
}