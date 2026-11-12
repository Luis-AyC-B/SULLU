// src/features/registro-ingresos/components/IngresosFiltrosToolbar.tsx
"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  GESTIONES_DISPONIBLES,
  obtenerGestionPorFecha,
  type ExamenControl,
  type FiltrosIngresos,
  type GestionAcademica,
} from "../types/ingresos.types";
import { obtenerNombreMateria } from "../lib/generarPdfReporteIngresos";

/**
 * Roles del módulo Registro de Ingresos:
 *  - "docente"  → rol predefinido por el sistema. Filtros: Gestión, Materia, Examen.
 *  - "custom"   → rol personalizado creado a partir del docente.
 *                  Filtros: Docente, Gestión, Materia, Examen.
 *  - "control"  → personal de control. Filtros: Docente, Gestión, Materia, Examen.
 *  - "admin"    → administrador. Filtros: Facultad, Docente, Gestión, Materia, Examen.
 */
export type RolIngresos = "docente" | "custom" | "control" | "admin";

interface IngresosFiltrosToolbarProps {
  rol: RolIngresos;
  examenes: ExamenControl[];
  filtros: FiltrosIngresos;
  onFiltrosChange: (filtros: FiltrosIngresos) => void;
  isLoading?: boolean;
}

export function IngresosFiltrosToolbar({
  rol,
  examenes,
  filtros,
  onFiltrosChange,
  isLoading = false,
}: IngresosFiltrosToolbarProps) {
  // Asegurar que cada examen tenga su gestión asignada según Criterio 5.
  // Los campos facultad, carrera, materia, docente deben venir del backend;
  // solo la gestión se calcula como fallback a partir de la fecha.
  const examenesConGestion = useMemo(() => {
    return examenes.map((e) => ({
      ...e,
      gestion: e.gestion || obtenerGestionPorFecha(e.fecha),
      materia: e.materia || (e.nombre ? obtenerNombreMateria(e.nombre) : undefined),
      facultadId: e.facultadId ? String(e.facultadId) : undefined,
      carreraId: e.carreraId ? String(e.carreraId) : (e.carrera ? String(e.carrera) : undefined),
      docenteId: e.docenteId ? String(e.docenteId) : undefined,
    }));
  }, [examenes]);

  // 1. Filtrado base por Gestión (Criterio 4, 5)
  const examenesEnGestion = useMemo(() => {
    return examenesConGestion.filter((e) => e.gestion === filtros.gestion);
  }, [examenesConGestion, filtros.gestion]);

  // 2. Facultades disponibles (solo Admin, Criterio 7)
  const facultadesDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    examenesEnGestion.forEach((e) => {
      const id = e.facultadId ? String(e.facultadId) : (e.facultad || "");
      const nombre = e.facultad || id;
      if (id && nombre) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [examenesEnGestion]);

  // Filtrado por Facultad para calcular Carreras, Docentes y Materias siguientes (Criterio 8)
  const examenesPorFacultad = useMemo(() => {
    if (!filtros.facultadId || filtros.facultadId === "TODAS") {
      return examenesEnGestion;
    }
    return examenesEnGestion.filter(
      (e) => {
        const id = e.facultadId ? String(e.facultadId) : (e.facultad || "");
        return id === filtros.facultadId;
      }
    );
  }, [examenesEnGestion, filtros.facultadId]);

  // 2.5 Carreras disponibles (solo Admin, filtradas por Facultad)
  const carrerasDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    examenesPorFacultad.forEach((e) => {
      const id = e.carreraId ? String(e.carreraId) : (e.carrera || "");
      const nombre = e.carrera || id;
      if (id && nombre) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [examenesPorFacultad]);

  // Filtrado por Carrera para calcular Docentes y Materias siguientes
  const examenesPorCarrera = useMemo(() => {
    if (!filtros.carreraId || filtros.carreraId === "TODAS") {
      return examenesPorFacultad;
    }
    return examenesPorFacultad.filter((e) => {
      const id = e.carreraId ? String(e.carreraId) : (e.carrera || "");
      return id === filtros.carreraId;
    });
  }, [examenesPorFacultad, filtros.carreraId]);

  // 3. Docentes disponibles (Admin, Control y Custom, Criterio 8)
  const docentesDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    examenesPorCarrera.forEach((e) => {
      const id = e.docenteId ? String(e.docenteId) : (e.docente || "");
      const nombre = e.docente || id;
      if (id && nombre) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [examenesPorCarrera]);

  // Filtrado por Docente para calcular Materias siguientes (Criterio 9)
  const examenesPorDocente = useMemo(() => {
    if (rol === "docente" || !filtros.docenteId || filtros.docenteId === "TODOS") {
      return examenesPorCarrera;
    }
    return examenesPorCarrera.filter(
      (e) => {
        const id = e.docenteId ? String(e.docenteId) : (e.docente || "");
        return id === filtros.docenteId;
      }
    );
  }, [examenesPorCarrera, filtros.docenteId, rol]);

  // 4. Materias disponibles (Todos los roles, Criterio 9, 10)
  const materiasDisponibles = useMemo(() => {
    const set = new Set<string>();
    examenesPorDocente.forEach((e) => {
      if (e.materia) set.add(e.materia);
    });
    return Array.from(set).sort();
  }, [examenesPorDocente]);

  // Filtrado por Materia para calcular Exámenes siguientes
  const examenesPorMateria = useMemo(() => {
    if (!filtros.materiaId || filtros.materiaId === "TODAS") {
      return examenesPorDocente;
    }
    return examenesPorDocente.filter((e) => e.materia === filtros.materiaId);
  }, [examenesPorDocente, filtros.materiaId]);

  // 5. Exámenes disponibles
  const examenesDisponibles = useMemo(() => {
    return examenesPorMateria;
  }, [examenesPorMateria]);

  // Handlers con efecto Cascada (Criterio 8, 9)
  const handleFacultadChange = (nuevaFacultad: string) => {
    const nuevaListaExamenes =
      nuevaFacultad === "TODAS"
        ? examenesEnGestion
        : examenesEnGestion.filter((e) => String(e.facultadId) === nuevaFacultad);

    // Si la carrera ya no pertenece, reset a TODAS
    const carreraValida = nuevaListaExamenes.some((e) => {
      const id = e.carreraId ? String(e.carreraId) : (e.carrera || "");
      return id === filtros.carreraId;
    });
    const nuevaCarrera = carreraValida ? filtros.carreraId : "TODAS";

    const listaConCarrera =
      nuevaCarrera === "TODAS"
        ? nuevaListaExamenes
        : nuevaListaExamenes.filter((e) => {
            const id = e.carreraId ? String(e.carreraId) : (e.carrera || "");
            return id === nuevaCarrera;
          });

    // Si el docente ya no pertenece, reset a TODOS
    const docenteValido = listaConCarrera.some(
      (e) => String(e.docenteId) === filtros.docenteId
    );
    const nuevoDocente = docenteValido ? filtros.docenteId : "TODOS";

    // Si la materia ya no pertenece, reset a TODAS
    const materiaValida = listaConCarrera.some(
      (e) => e.materia === filtros.materiaId
    );
    const nuevaMateria = materiaValida ? filtros.materiaId : "TODAS";

    onFiltrosChange({
      ...filtros,
      facultadId: nuevaFacultad,
      carreraId: nuevaCarrera,
      docenteId: nuevoDocente,
      materiaId: nuevaMateria,
      examenId: "TODOS",
    });
  };

  const handleCarreraChange = (nuevaCarrera: string) => {
    const nuevaLista =
      nuevaCarrera === "TODAS"
        ? examenesPorFacultad
        : examenesPorFacultad.filter((e) => {
            const id = e.carreraId ? String(e.carreraId) : (e.carrera || "");
            return id === nuevaCarrera;
          });

    const docenteValido = nuevaLista.some(
      (e) => String(e.docenteId) === filtros.docenteId
    );
    const nuevoDocente = docenteValido ? filtros.docenteId : "TODOS";

    const materiaValida = nuevaLista.some((e) => e.materia === filtros.materiaId);
    const nuevaMateria = materiaValida ? filtros.materiaId : "TODAS";

    onFiltrosChange({
      ...filtros,
      carreraId: nuevaCarrera,
      docenteId: nuevoDocente,
      materiaId: nuevaMateria,
      examenId: "TODOS",
    });
  };

  const handleDocenteChange = (nuevoDocente: string) => {
    const nuevaLista =
      nuevoDocente === "TODOS"
        ? examenesPorCarrera
        : examenesPorCarrera.filter((e) => String(e.docenteId) === nuevoDocente);

    const materiaValida = nuevaLista.some((e) => e.materia === filtros.materiaId);
    const nuevaMateria = materiaValida ? filtros.materiaId : "TODAS";

    onFiltrosChange({
      ...filtros,
      docenteId: nuevoDocente,
      materiaId: nuevaMateria,
      examenId: "TODOS",
    });
  };

  const handleGestionChange = (nuevaGestion: string) => {
    const gestionTyped = nuevaGestion as GestionAcademica;
    const nuevaListaGestion = examenesConGestion.filter(
      (e) => e.gestion === gestionTyped
    );

    const facValida = nuevaListaGestion.some(
      (e) => String(e.facultadId) === filtros.facultadId
    );
    const carValida = nuevaListaGestion.some((e) => {
      const id = e.carreraId ? String(e.carreraId) : (e.carrera || "");
      return id === filtros.carreraId;
    });
    const docValido = nuevaListaGestion.some(
      (e) => String(e.docenteId) === filtros.docenteId
    );
    const matValida = nuevaListaGestion.some(
      (e) => e.materia === filtros.materiaId
    );

    onFiltrosChange({
      facultadId: facValida ? filtros.facultadId : "TODAS",
      carreraId: carValida ? filtros.carreraId : "TODAS",
      docenteId: docValido ? filtros.docenteId : "TODOS",
      gestion: gestionTyped,
      materiaId: matValida ? filtros.materiaId : "TODAS",
      examenId: "TODOS",
    });
  };

  const handleMateriaChange = (nuevaMateria: string) => {
    onFiltrosChange({
      ...filtros,
      materiaId: nuevaMateria,
      examenId: "TODOS",
    });
  };

  const handleExamenChange = (nuevoExamen: string) => {
    onFiltrosChange({
      ...filtros,
      examenId: nuevoExamen,
    });
  };

  const placeholderMateria =
    rol === "docente" || docentesDisponibles.length <= 1
      ? "Todas mis materias"
      : "Todas las materias";

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
        {/* 1. Facultad (Solo Administrador, Criterio 7) */}
        {rol === "admin" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Facultad
            </label>
            <Select
              value={filtros.facultadId || "TODAS"}
              onValueChange={handleFacultadChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs">
                <SelectValue placeholder="Todas las facultades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las facultades</SelectItem>
                {facultadesDisponibles.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 1.5. Carrera (Solo Administrador) */}
        {rol === "admin" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Carrera
            </label>
            <Select
              value={filtros.carreraId || "TODAS"}
              onValueChange={handleCarreraChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs">
                <SelectValue placeholder="Todas las carreras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las carreras</SelectItem>
                {carrerasDisponibles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 2. Docente (Admin SIEMPRE lo ve; Control y Custom solo si hay >1 docente; Docente NUNCA) */}
        {rol !== "docente" && (rol === "admin" || ((rol === "control" || rol === "custom") && docentesDisponibles.length > 1)) && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Docente
            </label>
            <Select
              value={filtros.docenteId || "TODOS"}
              onValueChange={handleDocenteChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs">
                <SelectValue placeholder="Todos los docentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los docentes</SelectItem>
                {docentesDisponibles.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 3. Gestión (Todos los roles, Criterio 4, sin opción "Todas") */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700">
            Gestión
          </label>
          <Select
            value={filtros.gestion}
            onValueChange={handleGestionChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs">
              <SelectValue placeholder="Seleccione gestión" />
            </SelectTrigger>
            <SelectContent>
              {GESTIONES_DISPONIBLES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Materia (Todos los roles, Criterio 10) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700">
            Materia
          </label>
          <Select
            value={filtros.materiaId || "TODAS"}
            onValueChange={handleMateriaChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs">
              <SelectValue placeholder={placeholderMateria} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">{placeholderMateria}</SelectItem>
              {materiasDisponibles.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Examen (Todos los roles, Criterio 6) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700">
            Examen
          </label>
          <Select
            value={filtros.examenId || "TODOS"}
            onValueChange={handleExamenChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs">
              <SelectValue placeholder="Todos los exámenes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los exámenes</SelectItem>
              {examenesDisponibles.map((e) => (
                <SelectItem key={String(e.id)} value={String(e.id)}>
                  {e.nombre} ({e.fecha})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
