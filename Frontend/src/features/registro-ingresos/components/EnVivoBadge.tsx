// src/features/registro-ingresos/components/EnVivoBadge.tsx
import type { EstadoConexion } from '../types/ingresos.types';

interface EnVivoBadgeProps {
  conexion: EstadoConexion;
  ingresados?: number;
  total?: number;
}

export function EnVivoBadge({ conexion, ingresados, total }: EnVivoBadgeProps) {
  const conectado = conexion === 'conectado';
  const tieneContador = ingresados !== undefined && total !== undefined;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
        conectado
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          conectado ? 'animate-pulse bg-success' : 'bg-destructive'
        }`}
      />
      {conectado
        ? `En vivo${tieneContador ? ` · ${ingresados} de ${total}` : ''}`
        : 'Desconectado · reintentando'}
    </span>
  );
}