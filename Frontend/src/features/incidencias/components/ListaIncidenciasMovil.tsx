import {
  etiquetaContadorIncidencias,
  formatearHoraIncidencia,
  type Incidencia,
} from "../types/incidencias.types";
import { InsigniaMotivoExpulsion } from "./InsigniaMotivoExpulsion";

interface ListaIncidenciasMovilProps {
  // Ya filtradas, de la más reciente a la más antigua.
  incidencias: Incidencia[];
  // Total de incidencias del examen (sin filtrar), para el contador.
  total: number;
}

export function ListaIncidenciasMovil({
  incidencias,
  total,
}: ListaIncidenciasMovilProps) {
  return (
    <div className="md:hidden">
      <ul className="flex flex-col gap-4">
        {incidencias.map((incidencia) => (
          <li
            key={incidencia.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <time
                dateTime={incidencia.fechaHora}
                className="font-semibold tabular-nums"
              >
                {formatearHoraIncidencia(incidencia.fechaHora)}
              </time>
              <span className="text-sm tabular-nums text-muted-foreground">
                SIS: {incidencia.codigoSis}
              </span>
            </div>

            <p className="mt-3 font-semibold">{incidencia.estudianteNombre}</p>

            <InsigniaMotivoExpulsion
              motivo={incidencia.motivo}
              className="mt-3 w-full"
            />

            {/* Texto plano: React escapa el contenido, no se ejecuta HTML. */}
            <p className="mt-3 whitespace-pre-wrap break-words text-body text-muted-foreground">
              {incidencia.detalle}
            </p>

            <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
              Registrado por {incidencia.registradoPor}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted-foreground">
        {etiquetaContadorIncidencias(total)}
      </p>
    </div>
  );
}