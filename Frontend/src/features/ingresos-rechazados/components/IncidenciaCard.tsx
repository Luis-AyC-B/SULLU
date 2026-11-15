import {
  formatHoraIncidencia,
  type Incidencia,
} from "../types/incidencias.types";
import { MotivoBadge } from "./MotivoBadge";

interface IncidenciaCardProps {
  incidencia: Incidencia;
}

export function IncidenciaCard({ incidencia }: IncidenciaCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <time
          dateTime={incidencia.fechaHora}
          className="text-sm tabular-nums"
        >
          {formatHoraIncidencia(incidencia.fechaHora)}
        </time>
        <MotivoBadge motivo={incidencia.motivo} />
      </div>

      <p className="mt-3 text-body font-semibold">
        {incidencia.estudianteNombre}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Código SIS: {incidencia.codigoSis}
      </p>

      {/* Texto plano: React escapa el contenido, nunca se ejecuta. */}
      {incidencia.observaciones && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {incidencia.observaciones}
        </p>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">Registrado por</p>
        <p className="text-body">{incidencia.registradoPor}</p>
      </div>
    </article>
  );
}