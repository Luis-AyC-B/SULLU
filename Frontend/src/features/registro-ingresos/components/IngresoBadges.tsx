// src/features/registro-ingresos/components/IngresoBadges.tsx
import type { EstadoIngreso, MetodoIngreso } from "../types/ingresos.types";

export function MetodoBadge({ metodo }: { metodo: MetodoIngreso }) {
  return (
    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {metodo}
    </span>
  );
}

const ESTADO_STYLES: Record<EstadoIngreso, string> = {
  Habilitado: "border-success/30 bg-success/10 text-success",
  Inhabilitado: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function EstadoBadge({ estado }: { estado: EstadoIngreso }) {
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[estado]}`}
    >
      {estado}
    </span>
  );
}