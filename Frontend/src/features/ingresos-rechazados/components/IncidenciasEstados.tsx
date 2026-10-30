import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

// Estados no incluidos en los mockups (cargando, vacío y error): diseñados
// con los patrones existentes (skeleton animate-pulse, error en destructive).

interface IncidenciasSkeletonProps {
  conSelector?: boolean;
}

export function IncidenciasSkeleton({
  conSelector = false,
}: IncidenciasSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-label="Cargando incidencias"
    >
      <span className="sr-only">Cargando…</span>

      {conSelector && (
        <div className="flex flex-col gap-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-md bg-muted md:max-w-xl" />
        </div>
      )}

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <div className="h-12 animate-pulse bg-muted/60" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-8 border-t border-border px-5 py-5"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-6 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Móvil: tarjetas */}
      <div className="flex flex-col gap-4 md:hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

interface IncidenciasVacioProps {
  titulo: string;
  descripcion?: string;
}

export function IncidenciasVacio({ titulo, descripcion }: IncidenciasVacioProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-body font-semibold">{titulo}</p>
      {descripcion && (
        <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>
      )}
    </div>
  );
}

interface IncidenciasErrorProps {
  mensaje: string;
  onReintentar: () => void;
}

export function IncidenciasError({
  mensaje,
  onReintentar,
}: IncidenciasErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-8 text-center text-destructive"
    >
      <AlertCircle className="h-6 w-6" aria-hidden="true" />
      <p className="text-body font-medium">{mensaje}</p>
      <Button type="button" variant="outline" onClick={onReintentar}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}