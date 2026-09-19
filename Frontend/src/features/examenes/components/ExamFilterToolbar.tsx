"use client";

import React, { useMemo } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { ExamFilters, MateriaOption } from "../types/exam.types";
import { MOCK_MATERIAS } from "../hooks/useExams";

interface ExamFilterToolbarProps {
  filters: ExamFilters;
  onFilterChange: (filters: ExamFilters) => void;
  // Permisos dinámicos por alcance según el rol del usuario
  canFilterFacultad?: boolean;
  canFilterCarrera?: boolean;
}

export function ExamFilterToolbar({
  filters,
  onFilterChange,
  canFilterFacultad = true,
  canFilterCarrera = true,
}: ExamFilterToolbarProps) {
  // Obtener listas únicas para los selectores
  const facultades = useMemo(() => {
    const map = new Map<string, string>();
    MOCK_MATERIAS.forEach((m) => map.set(m.facultadId, m.facultadNombre));
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, []);

  const carreras = useMemo(() => {
    return MOCK_MATERIAS.filter((m) =>
      !filters.facultadId || m.facultadId === filters.facultadId
    ).reduce((acc: { id: string; nombre: string }[], curr) => {
      if (!acc.some((c) => c.id === curr.carreraId)) {
        acc.push({ id: curr.carreraId, nombre: curr.carreraNombre });
      }
      return acc;
    }, []);
  }, [filters.facultadId]);

  const materias = useMemo(() => {
    return MOCK_MATERIAS.filter((m) => {
      if (filters.facultadId && m.facultadId !== filters.facultadId) return false;
      if (filters.carreraId && m.carreraId !== filters.carreraId) return false;
      return true;
    });
  }, [filters.facultadId, filters.carreraId]);

  const handleChange = (field: keyof ExamFilters, value: string) => {
    const updated = { ...filters, [field]: value };
    // Si cambia facultad, limpiar carrera y materia si ya no corresponden
    if (field === "facultadId") {
      updated.carreraId = "";
      updated.materiaId = "";
    }
    // Si cambia carrera, limpiar materia
    if (field === "carreraId") {
      updated.materiaId = "";
    }
    onFilterChange(updated);
  };

  const handleReset = () => {
    onFilterChange({
      facultadId: "",
      carreraId: "",
      materiaId: "",
      fechaInicio: "",
      fechaFin: "",
    });
  };

  const hasActiveFilters = Boolean(
    filters.facultadId ||
      filters.carreraId ||
      filters.materiaId ||
      filters.fechaInicio ||
      filters.fechaFin
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0a1f44]">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Filtros de Búsqueda</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Filtro: Facultad (Solo si tiene permisos) */}
        {canFilterFacultad && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Facultad
            </label>
            <select
              value={filters.facultadId}
              onChange={(e) => handleChange("facultadId", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas las facultades</option>
              {facultades.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro: Carrera (Solo si tiene permisos) */}
        {canFilterCarrera && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Carrera
            </label>
            <select
              value={filters.carreraId}
              onChange={(e) => handleChange("carreraId", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas las carreras</option>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro: Materia (Mínimo para todos los docentes) */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Materia
          </label>
          <select
            value={filters.materiaId}
            onChange={(e) => handleChange("materiaId", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las materias</option>
            {materias.map((m: MateriaOption) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: Fecha Inicio */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Desde
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.fechaInicio}
              onChange={(e) => handleChange("fechaInicio", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filtro: Fecha Fin */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Hasta
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.fechaFin}
              onChange={(e) => handleChange("fechaFin", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
