"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { EstudianteBusquedaItem } from "../../types/control-ingreso.types";
import { ListaResultadosEstudiantes } from "./ListaResultadosEstudiantes";

interface BusquedaEstudianteStepProps {
  onBuscar: (query: string) => Promise<void>;
  onSeleccionar: (estudiante: EstudianteBusquedaItem) => void;
  resultados: EstudianteBusquedaItem[];
  isLoading: boolean;
  busquedaRealizada: boolean;
  queryActual: string;
}

export function BusquedaEstudianteStep({
  onBuscar,
  onSeleccionar,
  resultados,
  isLoading,
  busquedaRealizada,
  queryActual,
}: BusquedaEstudianteStepProps) {
  const [termino, setTermino] = useState(queryActual);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTerm = termino.trim();
    if (!cleanTerm) {
      setErrorValidacion("Ingresa un código SIS, carnet o nombre para buscar");
      return;
    }
    if (cleanTerm.length < 2) {
      setErrorValidacion("Ingresa al menos 2 caracteres");
      return;
    }
    setErrorValidacion(null);
    onBuscar(cleanTerm);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Formulario de Búsqueda */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <label
          htmlFor="busqueda-input"
          className="text-[11px] font-bold text-slate-600 tracking-wider uppercase"
        >
          CÓDIGO SIS / NOMBRE
        </label>

        {/* Layout Desktop: Input + Botón en línea / Mobile: Input arriba, Botón abajo */}
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              id="busqueda-input"
              type="text"
              value={termino}
              onChange={(e) => {
                setTermino(e.target.value);
                if (errorValidacion) setErrorValidacion(null);
              }}
              placeholder="Ej. 2021-10234 o Valentina"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#002D62] focus:ring-2 focus:ring-[#002D62]/10 outline-none text-sm text-slate-800 placeholder:text-slate-400 transition-colors"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <span>Buscar</span>
            )}
          </button>
        </div>

        {errorValidacion && (
          <p className="text-xs text-rose-600 font-medium mt-1">
            {errorValidacion}
          </p>
        )}
      </form>

      {/* Estado Cargando */}
      {isLoading && (
        <div className="border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="h-6 w-6 text-[#002D62] animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            Buscando estudiantes en la base de datos...
          </p>
        </div>
      )}

      {/* Estado Inicial Vacío */}
      {!isLoading && !busquedaRealizada && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mb-3 text-slate-400">
            <Search className="h-5 w-5" />
          </div>
          <h4 className="text-sm md:text-base font-bold text-slate-800 mb-1">
            Busca un estudiante
          </h4>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Los resultados aparecerán aquí sin salir de esta pantalla.
          </p>
        </div>
      )}

      {/* Lista de Resultados o Sin Coincidencias */}
      {!isLoading && busquedaRealizada && (
        <ListaResultadosEstudiantes
          resultados={resultados}
          query={queryActual}
          onSeleccionar={onSeleccionar}
        />
      )}
    </div>
  );
}
