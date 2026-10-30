import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  etiquetaContadorIncidencias,
  formatearHoraIncidencia,
  type Incidencia,
} from "../types/incidencias.types";
import { InsigniaMotivoExpulsion } from "./InsigniaMotivoExpulsion";

interface TablaIncidenciasProps {
  // Ya filtradas, de la más reciente a la más antigua.
  incidencias: Incidencia[];
  // Total de incidencias del examen (sin filtrar), para el contador.
  total: number;
}

export function TablaIncidencias({ incidencias, total }: TablaIncidenciasProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
      <Table className="min-w-[760px]">
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-label px-4 py-3">Hora</TableHead>
            <TableHead className="text-label px-4 py-3">Código SIS</TableHead>
            <TableHead className="text-label px-4 py-3">Estudiante</TableHead>
            <TableHead className="text-label px-4 py-3">Motivo</TableHead>
            <TableHead className="text-label px-4 py-3">Detalle</TableHead>
            <TableHead className="text-label px-4 py-3">Registrado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidencias.map((incidencia) => (
            <TableRow key={incidencia.id}>
              <TableCell className="whitespace-nowrap px-4 py-5 tabular-nums">
                <time dateTime={incidencia.fechaHora}>
                  {formatearHoraIncidencia(incidencia.fechaHora)}
                </time>
              </TableCell>
              <TableCell className="px-4 py-5 tabular-nums">
                {incidencia.codigoSis}
              </TableCell>
              <TableCell className="px-4 py-5 font-medium">
                {incidencia.estudianteNombre}
              </TableCell>
              <TableCell className="px-4 py-5">
                <InsigniaMotivoExpulsion motivo={incidencia.motivo} />
              </TableCell>
              {/* Texto plano: React escapa el contenido, no se ejecuta HTML. */}
              <TableCell className="max-w-xs whitespace-pre-wrap break-words px-4 py-5 text-muted-foreground">
                {incidencia.detalle}
              </TableCell>
              <TableCell className="px-4 py-5">
                {incidencia.registradoPor}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
        {etiquetaContadorIncidencias(total)}
      </p>
    </div>
  );
}