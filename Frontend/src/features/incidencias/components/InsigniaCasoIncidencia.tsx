import { cn } from "cn";
import {
  ETIQUETA_CASO_INCIDENCIA,
  type CasoIncidencia,
} from "../types/incidencias.types";

interface InsigniaCasoIncidenciaProps {
  caso: CasoIncidencia;
  className?: string;
}

const ESTILOS_CASO: Record<CasoIncidencia, string> = {
  EXPULSION:
    "border-destructive/40 bg-destructive/15 text-destructive font-semibold",
  SUPLANTACION_IDENTIDAD:
    "border-rose-600/40 bg-rose-600/15 text-rose-700 dark:text-rose-400 font-semibold",
  AMONESTACION:
    "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium",
  PROBLEMA_MEDICO:
    "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium",
  RETIRO_VOLUNTARIO:
    "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-400 font-medium",
  INCIDENCIA_TECNICA:
    "border-teal-500/40 bg-teal-500/15 text-teal-700 dark:text-teal-400 font-medium",
  OTRO: "border-border bg-muted text-muted-foreground font-medium",
};

export function InsigniaCasoIncidencia({
  caso,
  className,
}: InsigniaCasoIncidenciaProps) {
  const estilo = ESTILOS_CASO[caso] ?? ESTILOS_CASO.OTRO;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs sm:text-sm whitespace-nowrap",
        estilo,
        className,
      )}
    >
      {ETIQUETA_CASO_INCIDENCIA[caso] ?? caso}
    </span>
  );
}
