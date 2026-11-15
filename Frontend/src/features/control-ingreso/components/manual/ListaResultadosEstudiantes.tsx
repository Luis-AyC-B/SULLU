"use client";

import type {
  EstudianteBusquedaItem,
  MiGrupoControlador,
} from "../../types/control-ingreso.types";

interface ListaResultadosEstudiantesProps {
  resultados: EstudianteBusquedaItem[];
  query: string;
  onSeleccionar: (estudiante: EstudianteBusquedaItem) => void;
  miGrupo?: MiGrupoControlador | null;
}

function getInitials(nombre: string, apellido?: string): string {
  const n = nombre.trim()[0] || "";
  const a = apellido?.trim()[0] || "";
  return `${n}${a}`.toUpperCase() || "E";
}

export function ListaResultadosEstudiantes({
  resultados,
  query,
  onSeleccionar,
  miGrupo,
}: ListaResultadosEstudiantesProps) {
  if (resultados.length === 0) {
    return (
      <div className="border border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
        <h4 className="text-sm font-bold text-slate-800 mb-1">
          Sin resultados
        </h4>
        <p className="text-xs text-slate-500">
          No se encontraron coincidencias para &ldquo;{query}&rdquo;. Verifica el
          código SIS, carnet o nombre ingresado.
        </p>
      </div>
    );
  }

  const tieneParticion = Boolean(
    miGrupo && miGrupo.totalEstudiantesGrupo < miGrupo.totalEstudiantesExamen
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Contador de Coincidencias */}
      <p className="text-xs text-slate-500 font-medium px-1">
        {resultados.length}{" "}
        {resultados.length === 1 ? "coincidencia" : "coincidencias"} con &ldquo;
        {query}&rdquo;
      </p>

      {/* Lista de Tarjetas */}
      <div className="flex flex-col gap-2.5 max-h-[50vh] md:max-h-[380px] overflow-y-auto pr-1">
        {resultados.map((estudiante) => {
          const initials = getInitials(estudiante.nombre, estudiante.apellido);
          const nombreCompleto = `${estudiante.nombre} ${
            estudiante.apellido ?? ""
          }`.trim();

          const esDeMiGrupo =
            !tieneParticion ||
            miGrupo?.estudiantes.some(
              (e) => e.id === estudiante.id || e.codSis === estudiante.codSis
            );

          // Texto del badge: usar nombreLista del estudiante si está disponible
          const badgeTexto = estudiante.nombreLista
            ? `${estudiante.nombreLista}${estudiante.rangoAsignado ? ` (${estudiante.rangoAsignado})` : ""}`
            : miGrupo
              ? `Fuera de tu fila (${miGrupo.rango})`
              : "Fuera de tu fila";

          return (
            <div
              key={estudiante.id}
              className={`border rounded-2xl p-4 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                esDeMiGrupo
                  ? "border-slate-200/90 bg-white hover:border-slate-300"
                  : "border-amber-200/80 bg-amber-50/40 opacity-80"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar Iniciales */}
                <div
                  className={`h-10 w-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                    esDeMiGrupo
                      ? "bg-blue-50 text-[#002D62] border-blue-100"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  {initials}
                </div>

                {/* Datos del Estudiante */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {nombreCompleto}
                    </h4>
                    {!esDeMiGrupo && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        Asignado a: {badgeTexto}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {estudiante.codSis.replace(/-/g, "")}
                  </p>
                </div>
              </div>

              {/* Botón Seleccionar: Deshabilitado si no pertenece al grupo */}
              <div className="pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-center md:text-right">
                <button
                  type="button"
                  onClick={() => esDeMiGrupo && onSeleccionar(estudiante)}
                  disabled={!esDeMiGrupo}
                  aria-disabled={!esDeMiGrupo}
                  className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    esDeMiGrupo
                      ? "text-slate-800 hover:text-[#002D62] hover:bg-slate-50 cursor-pointer"
                      : "text-amber-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  {esDeMiGrupo ? "Seleccionar" : "No corresponde a tu fila"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
