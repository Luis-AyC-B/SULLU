// src/features/registro-ingresos/components/IngresoCard.tsx
import { EstadoBadge, MetodoBadge } from "./IngresoBadges";
import { formatHoraIngreso, type Ingreso } from "../types/ingresos.types";

interface IngresoCardProps {
  ingreso: Ingreso;
  destacado?: boolean;
}

export function IngresoCard({ ingreso, destacado = false }: IngresoCardProps) {
  const tieneCaso = Boolean(ingreso.casoExcepcional);

  return (
    <div
      className={`rounded-xl border p-4 ${
        destacado ? "border-success/30 bg-success/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-medium tabular-nums">
          {formatHoraIngreso(ingreso.hora, tieneCaso)}
        </span>
        <EstadoBadge estado={ingreso.estado} />
      </div>

      <p className="mt-3 text-base font-semibold text-foreground">
        {ingreso.estudiante}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Código SIS: {ingreso.sis}
      </p>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
        Método
        <MetodoBadge metodo={ingreso.metodo} />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Caso excepcional: </span>
        {tieneCaso ? (
          <span className="text-amber-700 font-medium">{ingreso.casoExcepcional}</span>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}
