import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  labelContadorIncidencias,
  type Incidencia,
} from "../types/incidencias.types";
import { IncidenciaCard } from "./IncidenciaCard";
import { IncidenciasTableRow } from "./IncidenciasTableRow";

interface IncidenciasListaProps {
  incidencias: Incidencia[];
}

export function IncidenciasLista({ incidencias }: IncidenciasListaProps) {
  const contador = labelContadorIncidencias(incidencias.length);

  return (
    <>
      {/* Desktop: tabla con el contador dentro de la tarjeta */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-28 text-muted-foreground">Hora</TableHead>
              <TableHead className="w-36 text-muted-foreground">
                Código SIS
              </TableHead>
              <TableHead className="text-muted-foreground">Estudiante</TableHead>
              <TableHead className="w-44 text-muted-foreground">Motivo</TableHead>
              <TableHead className="w-56 text-muted-foreground">
                Registrado por
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidencias.map((incidencia) => (
              <IncidenciasTableRow key={incidencia.id} incidencia={incidencia} />
            ))}
          </TableBody>
        </Table>
        <p
          aria-live="polite"
          className="border-t border-border px-5 py-4 text-sm text-muted-foreground"
        >
          {contador}
        </p>
      </div>

      {/* Móvil: tarjetas con el contador al final */}
      <div className="flex flex-col gap-4 md:hidden">
        {incidencias.map((incidencia) => (
          <IncidenciaCard key={incidencia.id} incidencia={incidencia} />
        ))}
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {contador}
        </p>
      </div>
    </>
  );
}