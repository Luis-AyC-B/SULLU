"use client";

import { EstadoAmbiente } from "../schemas/ambiente.schema";
import { CheckCircle2, Wrench, Ban } from "lucide-react";

interface AmbienteEstadoBadgeProps {
  estado: EstadoAmbiente | string;
}

export function AmbienteEstadoBadge({ estado }: AmbienteEstadoBadgeProps) {
  const estadoUpper = estado?.toUpperCase();

  if (estadoUpper === "HABILITADO" || estadoUpper === "DISPONIBLE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Habilitado
      </span>
    );
  }

  if (estadoUpper === "EN_REMODELACION" || estadoUpper === "REMODELACION") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <Wrench className="w-3.5 h-3.5" />
        En remodelación
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
      <Ban className="w-3.5 h-3.5" />
      Inhabilitado
    </span>
  );
}
