// src/features/registro-ingresos/components/IngresosTableRow.tsx
import { TableRow, TableCell } from "@/shared/components/ui/table";
import { EstadoBadge, MetodoBadge } from "./IngresoBadges";
import { formatHoraIngreso, type Ingreso } from "../types/ingresos.types";

interface IngresosTableRowProps {
  ingreso: Ingreso;
  /** Resalta la fila (el ingreso más reciente) en verde claro. */
  destacado?: boolean;
}

export function IngresosTableRow({ ingreso, destacado = false }: IngresosTableRowProps) {
  const tieneCaso = Boolean(ingreso.casoExcepcional);

  return (
    <TableRow
      className={`bg-card ${destacado ? "bg-success/5 hover:bg-success/10" : ""}`}
    >
      <TableCell className="px-4 py-5 tabular-nums">
        {formatHoraIngreso(ingreso.hora, tieneCaso)}
      </TableCell>
      <TableCell className="px-4 py-5 tabular-nums">{ingreso.sis}</TableCell>
      <TableCell className="px-4 py-5 text-base font-medium">
        {ingreso.estudiante}
      </TableCell>
      <TableCell className="px-4 py-5">
        <MetodoBadge metodo={ingreso.metodo} />
      </TableCell>
      <TableCell className="px-4 py-5">
        <EstadoBadge estado={ingreso.estado} />
      </TableCell>
      <TableCell className="px-4 py-5 text-sm max-w-[220px]">
        {tieneCaso ? (
          <span className="line-clamp-2 text-amber-800 bg-amber-50/90 border border-amber-200/70 rounded-md px-2 py-0.5 text-xs font-medium inline-block">
            {ingreso.casoExcepcional}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
