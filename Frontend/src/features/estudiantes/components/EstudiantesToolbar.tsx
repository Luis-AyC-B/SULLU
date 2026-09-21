"use client";
import { Search, ChevronDown, X } from "lucide-react";
import { FiltroEstado } from "../types/estudiante.types";
interface EstudiantesToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filtroEstado: FiltroEstado;
  onFiltroEstadoChange: (filtro: FiltroEstado) => void;
}
export function EstudiantesToolbar({
  searchTerm,
  onSearchChange,
  filtroEstado,
  onFiltroEstadoChange,
}: EstudiantesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Buscador */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar estudiante por codSIS o nombre..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder:text-slate-500 shadow-2xs focus:border-[#002D62] focus:outline-hidden focus:ring-1 focus:ring-[#002D62] transition-colors"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* Selector de estado */}
      <div className="relative w-full sm:w-48">
        <select
          value={filtroEstado}
          onChange={(e) => onFiltroEstadoChange(e.target.value as FiltroEstado)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs focus:border-[#002D62] focus:outline-hidden focus:ring-1 focus:ring-[#002D62] transition-colors cursor-pointer"
        >
          <option value="todos">Filtrar por estado</option>
          <option value="habilitado">Habilitados</option>
          <option value="inhabilitado">Inhabilitados</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      </div>
    </div>
  );
}