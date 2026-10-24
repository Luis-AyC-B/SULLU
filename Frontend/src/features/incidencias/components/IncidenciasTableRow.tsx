import { TableCell, TableRow } from "@/shared/components/ui/table";
import {
  formatHoraIncidencia,
  type Incidencia,
} from "../types/incidencias.types";
import { MotivoBadge } from "./MotivoBadge";

interface IncidenciasTableRowProps {
  incidencia: Incidencia;
}

export function IncidenciasTableRow({ incidencia }: IncidenciasTableRowProps) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap tabular-nums">
        <time dateTime={incidencia.fechaHora}>
          {formatHoraIncidencia(incidencia.fechaHora)}
        </time>
      </TableCell>
      <TableCell
        className="tabular-nums max-w-[150px] truncate"
        title={incidencia.codigoSis}
      >
        {incidencia.codigoSis}
      </TableCell>
      <TableCell>
        <p className="text-body font-medium">{incidencia.estudianteNombre}</p>
        {/* Las observaciones se muestran como texto plano: React escapa el
            contenido, así que HTML o scripts nunca se ejecutan. */}
        {incidencia.observaciones && (
          <p className="mt-1 max-w-md whitespace-pre-wrap break-words text-label text-muted-foreground">
            {incidencia.observaciones}
          </p>
        )}
      </TableCell>
      <TableCell>
        <MotivoBadge motivo={incidencia.motivo} />
      </TableCell>
      <TableCell>{incidencia.registradoPor}</TableCell>
    </TableRow>
  );
}