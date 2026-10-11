// src/features/registro-ingresos/components/IngresoCard.tsx
import { EstadoBadge, MetodoBadge } from "./IngresoBadges";
import { formatHoraIngreso, type Ingreso } from "../types/ingresos.types";

interface IngresoCardProps {
  ingreso: Ingreso;
  destacado?: boolean;
}

export function IngresoCard({ ingreso, destacado = false }: IngresoCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destacado ? "border-success/30 bg-success/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-medium tabular-nums">
          {formatHoraIngreso(ingreso.hora)}
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
    </div>
  );
}