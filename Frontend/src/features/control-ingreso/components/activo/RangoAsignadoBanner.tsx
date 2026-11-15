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
        my-4 rounded-xl border border-blue-200/90 bg-[#F0F6FD]
        px-5 py-4
        flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
        shadow-xs
      "
      role="status"
      aria-label={`Tu fila asignada: ${miGrupo.nombreLista ? `${miGrupo.nombreLista} ` : ""}${miGrupo.rango}`}
    >
      {/* Lado izquierdo: ícono + rango */}
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl shadow-xs"
          style={{ backgroundColor: "#002D62", color: "#ffffff" }}
        >
          <Users className="w-5 h-5" style={{ color: "#ffffff" }} />
        </span>
        <div className="min-w-0">
          <p
            className="text-[11px] font-bold uppercase tracking-widest leading-none mb-1"
            style={{ color: "#002D62" }}
          >
            {miGrupo.nombreLista
              ? `Tu fila asignada · ${miGrupo.nombreLista}`
              : "Tu fila asignada"}
          </p>
          {/* Rango de letras: prominente */}
          <p
            className="text-2xl font-extrabold leading-tight tracking-tight"
            style={{ color: "#002D62" }}
          >
            {miGrupo.rango || `${miGrupo.letraInicio} – ${miGrupo.letraFin}`}
          </p>
          {/* Primer y último apellido */}
          {primerApellido && ultimoApellido && (
            <p className="text-xs text-slate-600 font-medium mt-1 truncate">
              <span className="font-semibold text-slate-800">{primerApellido}</span>
              {" → "}
              <span className="font-semibold text-slate-800">{ultimoApellido}</span>
            </p>
          )}
        </div>
      </div>

      {/* Lado derecho: conteo */}
      <div className="flex items-center gap-2 shrink-0 sm:text-right">
        <span
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold shadow-xs"
          style={{ backgroundColor: "#002D62", color: "#ffffff" }}
        >
          <span>{miGrupo.totalEstudiantesGrupo}</span>
          <span className="font-normal opacity-85" style={{ color: "#ffffff" }}>
            / {miGrupo.totalEstudiantesExamen}
          </span>
        </span>
        <span className="text-xs text-slate-600 font-medium hidden sm:inline">
          estudiantes
        </span>
      </div>
    </div>
  );
}
