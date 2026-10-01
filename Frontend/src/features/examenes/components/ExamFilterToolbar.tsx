"use client";

import React, { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { ExamFilters, MateriaOption } from "../types/exam.types";

interface ExamFilterToolbarProps {
  filters: ExamFilters;
  onFilterChange: (filters: ExamFilters) => void;
  materias?: MateriaOption[];
  canFilterFacultad?: boolean;
  canFilterCarrera?: boolean;
}

export function ExamFilterToolbar({
  filters,
  onFilterChange,
  materias = [],
  canFilterFacultad = true,
  canFilterCarrera = true,
}: ExamFilterToolbarProps) {
  // Alcance TOTAL (sin filtros aplicados): decide QUÉ dropdowns existen
  const scope = useMemo(() => {
    const fac = new Map<string, string>();
    const car = new Map<string, { nombre: string; facultadId: string }>();

    materias.forEach((m) => {
      if (m.facultadId) fac.set(m.facultadId, m.facultadNombre);
      if (m.carreraId) {
        car.set(m.carreraId, { nombre: m.carreraNombre, facultadId: m.facultadId });
      }
    });

    return {
      facultades: Array.from(fac, ([id, nombre]) => ({ id, nombre })),
      carreras: Array.from(car, ([id, c]) => ({ id, ...c })),
    };
  }, [materias]);

  const showFacultad = canFilterFacultad && scope.facultades.length > 1;
  const showCarrera = canFilterCarrera && scope.carreras.length > 1;
  const showMateria = materias.length > 1;

  // Opciones: estas SÍ dependen de lo que el usuario ya eligió
  const carreraOptions = useMemo(
    () =>
      filters.facultadId
        ? scope.carreras.filter((c) => c.facultadId === filters.facultadId)
        : scope.carreras,
    [scope.carreras, filters.facultadId]
  );

  const materiaOptions = useMemo(
    () =>
      materias.filter(
        (m) =>
          (!filters.facultadId || m.facultadId === filters.facultadId) &&
          (!filters.carreraId || m.carreraId === filters.carreraId)
      ),
    [materias, filters.facultadId, filters.carreraId]
  );

  const handleChange = (field: keyof ExamFilters, value: string) => {
    const updated = { ...filters, [field]: value };
    if (field === "facultadId") {
      updated.carreraId = "";
      updated.materiaId = "";
    }
    if (field === "carreraId") {
      updated.materiaId = "";
    }
    if (field === "fechaInicio" && updated.fechaFin && updated.fechaFin < value) {
      updated.fechaFin = "";
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

  const dropdownStyle =
    "w-[164px] h-[42px] rounded-lg border border-gray-200 px-3 text-[14px] text-[#1A1D23] bg-white outline-none focus:border-blue-500 cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {showFacultad && (
        <select
          value={filters.facultadId}
          onChange={(e) => handleChange("facultadId", e.target.value)}
          className={dropdownStyle}
          style={{ colorScheme: "light" }}
        >
          <option value="">Filtrar por facultad</option>
          {scope.facultades.map((f) => (
            <option key={f.id} value={f.id} className="text-[#1A1D23] bg-white">
              {f.nombre}
            </option>
          ))}
        </select>
      )}

      {showCarrera && (
        <select
          value={filters.carreraId}
          onChange={(e) => handleChange("carreraId", e.target.value)}
          className={dropdownStyle}
          style={{ colorScheme: "light" }}
        >
          <option value="">Filtrar por carrera</option>
          {carreraOptions.map((c) => (
            <option key={c.id} value={c.id} className="text-[#1A1D23] bg-white">
              {c.nombre}
            </option>
          ))}
        </select>
      )}

      {showMateria && (
        <select
          value={filters.materiaId}
          onChange={(e) => handleChange("materiaId", e.target.value)}
          className={dropdownStyle}
          style={{ colorScheme: "light" }}
        >
          <option value="">Filtrar por materia</option>
          {materiaOptions.map((m) => (
            <option key={m.id} value={m.id} className="text-[#1A1D23] bg-white">
              {m.nombre}
            </option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={filters.fechaInicio}
        max={filters.fechaFin || undefined}
        onChange={(e) => handleChange("fechaInicio", e.target.value)}
        className={dropdownStyle}
        style={{ colorScheme: "light" }}
      />

      <input
        type="date"
        value={filters.fechaFin}
        min={filters.fechaInicio || undefined}
        onChange={(e) => handleChange("fechaFin", e.target.value)}
        className={dropdownStyle}
        style={{ colorScheme: "light" }}
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
          title="Limpiar filtros"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Limpiar</span>
        </button>
      )}
    </div>
  );
}