"use client";

import { EstadoColaborador } from "../schemas/colaborador.schema";

interface ColaboradorEstadoBadgeProps {
  estado: EstadoColaborador;
  conPunto?: boolean;
  className?: string;
}

export function ColaboradorEstadoBadge({
  estado,
  conPunto = true,
  className = "",
}: ColaboradorEstadoBadgeProps) {
  const config: Record<
    EstadoColaborador,
    { label: string; bg: string; text: string; border: string; dot: string }
  > = {
    APROBADO: {
      label: "Aprobado",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    },
    PENDIENTE: {
      label: "Pendiente",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
    RECHAZADO: {
      label: "Rechazado",
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      dot: "bg-rose-500",
    },
    INACTIVO: {
      label: "Inactivo",
      bg: "bg-gray-100",
      text: "text-gray-600",
      border: "border-gray-200",
      dot: "bg-gray-500",
    },
  };

  const current = config[estado] || config.INACTIVO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {conPunto && <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />}
      {current.label}
    </span>
  );
}
