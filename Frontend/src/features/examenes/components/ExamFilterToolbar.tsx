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
  // 1. Obtener facultades únicas a partir de las materias reales
  const facultades = useMemo(() => {
    const map = new Map<string, string>();
    materias.forEach((m) => {
      if (m.facultadId && m.facultadNombre) {
        map.set(m.facultadId, m.facultadNombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [materias]);

  // 2. Obtener carreras filtradas por facultad
  const carreras = useMemo(() => {
    return materias
      .filter((m) => !filters.facultadId || m.facultadId === filters.facultadId)
      .reduce((acc: { id: string; nombre: string }[], curr) => {
        if (curr.carreraId && !acc.some((c) => c.id === curr.carreraId)) {
          acc.push({ id: curr.carreraId, nombre: curr.carreraNombre });
        }
        return acc;
      }, []);
  }, [materias, filters.facultadId]);

  // 3. Materias filtradas por facultad y carrera
  const filteredMaterias = useMemo(() => {
    return materias.filter((m) => {
      if (filters.facultadId && m.facultadId !== filters.facultadId) return false;
      if (filters.carreraId && m.carreraId !== filters.carreraId) return false;
      return true;
    });
  }, [materias, filters.facultadId, filters.carreraId]);

  const handleChange = (field: keyof ExamFilters, value: string) => {
    const updated = { ...filters, [field]: value };
    if (field === "facultadId") {
      updated.carreraId = "";
      updated.materiaId = "";
    }
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

  const dropdownStyle =
    "w-[164px] h-[42px] rounded-lg border border-gray-200 px-3 text-[14px] text-[#1A1D23] bg-white outline-none focus:border-blue-500 cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 1. Filtrar por Facultad (Admin Superior) */}
      {canFilterFacultad && (
        <select
          value={filters.facultadId}
          onChange={(e) => handleChange("facultadId", e.target.value)}
          className={dropdownStyle}
          style={{ colorScheme: "light" }}
        >
          <option value="">Filtrar por facultad</option>
          {facultades.map((f) => (
            <option key={f.id} value={f.id} className="text-[#1A1D23] bg-white">
              {f.nombre}
            </option>
          ))}
        </select>
      )}

      {/* 2. Filtrar por Carrera (Admin Superior e Intermedio) */}
      {canFilterCarrera && (
        <select
          value={filters.carreraId}
          onChange={(e) => handleChange("carreraId", e.target.value)}
          className={dropdownStyle}
          style={{ colorScheme: "light" }}
        >
          <option value="">Filtrar por carrera</option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id} className="text-[#1A1D23] bg-white">
              {c.nombre}
            </option>
          ))}
        </select>
      )}

      {/* 3. Filtrar por Materia (Todos los roles) */}
      <select
        value={filters.materiaId}
        onChange={(e) => handleChange("materiaId", e.target.value)}
        className={dropdownStyle}
        style={{ colorScheme: "light" }}
      >
        <option value="">Filtrar por materia</option>
        {filteredMaterias.map((m: MateriaOption) => (
          <option key={m.id} value={m.id} className="text-[#1A1D23] bg-white">
            {m.nombre}
          </option>
        ))}
      </select>

      {/* 4. Fecha Inicio */}
      <input
        type="date"
        value={filters.fechaInicio}
        onChange={(e) => handleChange("fechaInicio", e.target.value)}
        className={dropdownStyle}
        style={{ colorScheme: "light" }}
      />

      {/* 5. Fecha Fin */}
      <input
        type="date"
        value={filters.fechaFin}
        onChange={(e) => handleChange("fechaFin", e.target.value)}
        className={dropdownStyle}
        style={{ colorScheme: "light" }}
      />

      {/* Botón para limpiar filtros */}
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