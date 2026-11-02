import { ClipboardCheck } from "lucide-react";

interface EstadoVacioIncidenciasProps {
  // true si hay incidencias pero el buscador no encontró coincidencias
  hayBusqueda?: boolean;
}

export function EstadoVacioIncidencias({
  hayBusqueda = false,
}: EstadoVacioIncidenciasProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <ClipboardCheck aria-hidden className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-primary">
        {hayBusqueda
          ? "No se encontraron incidencias"
          : "Aún no hay incidencias en este examen"}
      </h2>
      <p className="mt-2 text-body text-muted-foreground">
        {hayBusqueda
          ? "Prueba con otro nombre o código SIS."
          : "Las expulsiones que registres aparecerán aquí."}
      </p>
    </div>
  );
}