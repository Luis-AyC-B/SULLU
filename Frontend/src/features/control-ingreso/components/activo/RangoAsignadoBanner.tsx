"use client";

import { Users } from "lucide-react";
import type { MiGrupoControlador } from "../../types/control-ingreso.types";

interface RangoAsignadoBannerProps {
  miGrupo: MiGrupoControlador;
}

/**
 * HU17: Banner visible que muestra al controlador su rango de apellidos asignado.
 * Se renderiza entre la tarjeta del examen y las tarjetas de acción.
 */
export function RangoAsignadoBanner({ miGrupo }: RangoAsignadoBannerProps) {
  const primerApellido = miGrupo.estudiantes[0]?.apellido ?? null;
  const ultimoApellido =
    miGrupo.estudiantes[miGrupo.estudiantes.length - 1]?.apellido ?? null;

  const tieneRangoReal =
    miGrupo.totalEstudiantesGrupo < miGrupo.totalEstudiantesExamen ||
    miGrupo.rango !== "A - Z";

  // Si el controlador tiene toda la lista, no hace falta mostrar el banner
  if (!tieneRangoReal) return null;

  return (
    <div
      className="
        rounded-xl border border-blue-200 bg-blue-50
        px-4 py-3
        flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2
        shadow-xs
      "
      role="status"
      aria-label={`Tu fila asignada: ${miGrupo.rango}`}
    >
      {/* Lado izquierdo: ícono + rango */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
          <Users className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 leading-none mb-0.5">
            Tu fila asignada
          </p>
          {/* Rango de letras: prominente */}
          <p className="text-2xl font-extrabold text-blue-900 leading-tight tracking-tight">
            {miGrupo.letraInicio} – {miGrupo.letraFin}
          </p>
          {/* Primer y último apellido */}
          {primerApellido && ultimoApellido && (
            <p className="text-xs text-blue-700 font-medium mt-0.5 truncate">
              {primerApellido} → {ultimoApellido}
            </p>
          )}
        </div>
      </div>

      {/* Lado derecho: conteo */}
      <div className="flex items-center gap-1.5 shrink-0 sm:text-right">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-bold">
          {miGrupo.totalEstudiantesGrupo}
          <span className="font-normal opacity-80">
            / {miGrupo.totalEstudiantesExamen}
          </span>
        </span>
        <span className="text-xs text-blue-700 font-medium hidden sm:inline">
          estudiantes
        </span>
      </div>
    </div>
  );
}
