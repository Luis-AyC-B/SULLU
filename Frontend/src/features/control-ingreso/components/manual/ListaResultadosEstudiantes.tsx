"use client";

import type { EstudianteBusquedaItem } from "../../types/control-ingreso.types";

interface ListaResultadosEstudiantesProps {
  resultados: EstudianteBusquedaItem[];
  query: string;
  onSeleccionar: (estudiante: EstudianteBusquedaItem) => void;
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

          return (
            <div
              key={estudiante.id}
              className="border border-slate-200/90 rounded-2xl p-4 bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar Iniciales */}
                <div className="h-10 w-10 rounded-full bg-blue-50 text-[#002D62] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                  {initials}
                </div>

                {/* Datos del Estudiante */}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {nombreCompleto}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {estudiante.codSis.replace(/-/g, "")}
                  </p>
                </div>
              </div>

              {/* Botón Seleccionar: En Desktop alineado a la derecha, en Mobile centrado abajo */}
              <div className="pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-center md:text-right">
                <button
                  type="button"
                  onClick={() => onSeleccionar(estudiante)}
                  className="w-full md:w-auto px-4 py-2 text-sm font-semibold text-slate-800 hover:text-[#002D62] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Seleccionar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
