// src/features/incidencias/components/IncidenciasFiltrosToolbar.tsx
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
  MOTIVOS_FILTRO_OPCIONES,
  obtenerGestionPorFecha,
  labelExamen,
  type ExamenIncidencia,
  type FiltrosIncidencias,
  type GestionAcademica,
  type RolIncidencias,
} from "../types/incidencias.types";
import { obtenerNombreMateriaIncidencia } from "../lib/generarPdfReporteObservaciones";

interface IncidenciasFiltrosToolbarProps {
  rol: RolIncidencias;
  examenes: ExamenIncidencia[];
  filtros: FiltrosIncidencias;
  onFiltrosChange: (nuevosFiltros: FiltrosIncidencias) => void;
  disabled?: boolean;
}

export function IncidenciasFiltrosToolbar({
  rol,
  examenes,
  filtros,
  onFiltrosChange,
  disabled = false,
}: IncidenciasFiltrosToolbarProps) {
  // Asegurar que cada examen tenga sus datos calculados para filtros
  const examenesEnriquecidos = useMemo(() => {
    return examenes.map((e) => ({
      ...e,
      gestion: e.gestion || obtenerGestionPorFecha(e.fecha),
      materia:
        e.materia ||
        (e.nombre ? obtenerNombreMateriaIncidencia(e.nombre) : undefined),
      facultadId: e.facultadId ? String(e.facultadId) : undefined,
      carreraId: e.carreraId
        ? String(e.carreraId)
        : e.carrera
        ? String(e.carrera)
        : undefined,
      docenteId: e.docenteId ? String(e.docenteId) : undefined,
    }));
  }, [examenes]);

  // 1. Filtrado base por Gestión (Criterio 5)
  const examenesEnGestion = useMemo(() => {
    const filtrados = examenesEnriquecidos.filter(
      (e) => e.gestion === filtros.gestion
    );
    return filtrados.length > 0 ? filtrados : examenesEnriquecidos;
  }, [examenesEnriquecidos, filtros.gestion]);

  // 2. Facultades disponibles (solo Admin, Criterio 6, 7)
  const facultadesDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    examenesEnGestion.forEach((e) => {
      const id = e.facultadId ? String(e.facultadId) : e.facultad || "";
      const nombre = e.facultad || id;
      if (id && nombre) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [examenesEnGestion]);

  // Filtrado por Facultad para Carreras, Docentes y Materias (Criterio 7)
  const examenesPorFacultad = useMemo(() => {
    if (!filtros.facultadId || filtros.facultadId === "TODAS") {
      return examenesEnGestion;
    }
    return examenesEnGestion.filter((e) => {
      const id = e.facultadId ? String(e.facultadId) : e.facultad || "";
      return id === filtros.facultadId;
    });
  }, [examenesEnGestion, filtros.facultadId]);

  // 3. Carreras disponibles (solo Admin, Criterio 7, 8)
  const carrerasDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    examenesPorFacultad.forEach((e) => {
      const id = e.carreraId ? String(e.carreraId) : e.carrera || "";
      const nombre = e.carrera || id;
      if (id && nombre) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [examenesPorFacultad]);

  // Filtrado por Carrera para Docentes y Materias (Criterio 8)
  const examenesPorCarrera = useMemo(() => {
    if (!filtros.carreraId || filtros.carreraId === "TODAS") {
      return examenesPorFacultad;
    }
    return examenesPorFacultad.filter((e) => {
      const id = e.carreraId ? String(e.carreraId) : e.carrera || "";
      return id === filtros.carreraId;
    });
  }, [examenesPorFacultad, filtros.carreraId]);

  // 4. Docentes disponibles (Admin, Control y Roles nuevos, Criterio 8, 9)
  const docentesDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    examenesPorCarrera.forEach((e) => {
      const id = e.docenteId ? String(e.docenteId) : e.docente || "";
      const nombre = e.docente || id;
      if (id && nombre) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [examenesPorCarrera]);

  // Filtrado por Docente para Materias (Criterio 9)
  const examenesPorDocente = useMemo(() => {
    if (rol === "docente" || !filtros.docenteId || filtros.docenteId === "TODOS") {
      return examenesPorCarrera;
    }
    return examenesPorCarrera.filter((e) => {
      const id = e.docenteId ? String(e.docenteId) : e.docente || "";
      return id === filtros.docenteId;
    });
  }, [examenesPorCarrera, filtros.docenteId, rol]);

  // 5. Materias disponibles (Todos los roles, Criterio 9, 10, 11)
  const materiasDisponibles = useMemo(() => {
    const set = new Set<string>();
    examenesPorDocente.forEach((e) => {
      if (e.materia) set.add(e.materia);
    });
    return Array.from(set).sort();
  }, [examenesPorDocente]);

  // Filtrado por Materia para Exámenes (Criterio 10)
  const examenesPorMateria = useMemo(() => {
    if (!filtros.materiaId || filtros.materiaId === "TODAS") {
      return examenesPorDocente;
    }
    return examenesPorDocente.filter((e) => e.materia === filtros.materiaId);
  }, [examenesPorDocente, filtros.materiaId]);

  // 6. Exámenes disponibles (Criterio 10)
  const examenesDisponibles = useMemo(() => {
    return examenesPorMateria;
  }, [examenesPorMateria]);

  // Criterio 11: Para el docente, "Todas mis materias". Para otros roles, "Todas las materias"
  const placeholderMateria =
    rol === "docente" ? "Todas mis materias" : "Todas las materias";

  // Criterio 1, 2, 3: Visibilidad del filtro Docente
  // Admin SIEMPRE lo ve; Control y Custom solo si hay >1 docente; Docente NUNCA lo ve
  const mostrarFiltroDocente =
    rol !== "docente" &&
    (rol === "admin" ||
      ((rol === "control" || rol === "custom") && docentesDisponibles.length > 1));

  // Handlers en cascada (Criterios 7, 8, 9, 10)
  const handleFacultadChange = (nuevaFacultad: string) => {
    const nuevaLista =
      nuevaFacultad === "TODAS"
        ? examenesEnGestion
        : examenesEnGestion.filter((e) => {
            const id = e.facultadId ? String(e.facultadId) : e.facultad || "";
            return id === nuevaFacultad;
          });

    const carreraValida = nuevaLista.some((e) => {
      const id = e.carreraId ? String(e.carreraId) : e.carrera || "";
      return id === filtros.carreraId;
    });
    const nuevaCarrera = carreraValida ? filtros.carreraId : "TODAS";

    const docenteValido = nuevaLista.some((e) => {
      const id = e.docenteId ? String(e.docenteId) : e.docente || "";
      return id === filtros.docenteId;
    });
    const nuevoDocente = docenteValido ? filtros.docenteId : "TODOS";

    const materiaValida = nuevaLista.some((e) => e.materia === filtros.materiaId);
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
            const id = e.carreraId ? String(e.carreraId) : e.carrera || "";
            return id === nuevaCarrera;
          });

    const docenteValido = nuevaLista.some((e) => {
      const id = e.docenteId ? String(e.docenteId) : e.docente || "";
      return id === filtros.docenteId;
    });
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
        : examenesPorCarrera.filter((e) => {
            const id = e.docenteId ? String(e.docenteId) : e.docente || "";
            return id === nuevoDocente;
          });

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
    onFiltrosChange({
      ...filtros,
      gestion: nuevaGestion as GestionAcademica,
      materiaId: "TODAS",
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

  const handleMotivoChange = (nuevoMotivo: string) => {
    onFiltrosChange({
      ...filtros,
      motivo: nuevoMotivo,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[#f0f4f9]/80 p-3.5 sm:p-4 border border-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* 1. Facultad (Solo Administrador, Criterio 3, 6, 7) */}
        {rol === "admin" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filtro-facultad-select"
              className="text-xs font-semibold text-gray-700"
            >
              Facultad
            </label>
            <Select
              value={filtros.facultadId || "TODAS"}
              onValueChange={handleFacultadChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="filtro-facultad-select"
                className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
              >
                <SelectValue placeholder="Todas las facultades" />
              </SelectTrigger>
              <SelectContent position="popper">
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

        {/* 2. Carrera (Solo Administrador, Criterio 3, 6, 8) */}
        {rol === "admin" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filtro-carrera-select"
              className="text-xs font-semibold text-gray-700"
            >
              Carrera
            </label>
            <Select
              value={filtros.carreraId || "TODAS"}
              onValueChange={handleCarreraChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="filtro-carrera-select"
                className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
              >
                <SelectValue placeholder="Todas las carreras" />
              </SelectTrigger>
              <SelectContent position="popper">
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

        {/* 3. Docente (Admin SIEMPRE; Control y Custom si >1 docente; Docente NUNCA, Criterio 1, 2, 3, 4) */}
        {mostrarFiltroDocente && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filtro-docente-select"
              className="text-xs font-semibold text-gray-700"
            >
              Docente
            </label>
            <Select
              value={filtros.docenteId || "TODOS"}
              onValueChange={handleDocenteChange}
              disabled={disabled}
            >
              <SelectTrigger
                id="filtro-docente-select"
                className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
              >
                <SelectValue placeholder="Todos los docentes" />
              </SelectTrigger>
              <SelectContent position="popper">
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

        {/* 4. Gestión (Todos los roles, Criterio 5) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-gestion-select"
            className="text-xs font-semibold text-gray-700"
          >
            Gestión
          </label>
          <Select
            value={filtros.gestion}
            onValueChange={handleGestionChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="filtro-gestion-select"
              className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
            >
              <SelectValue placeholder="Seleccione gestión" />
            </SelectTrigger>
            <SelectContent position="popper">
              {GESTIONES_DISPONIBLES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Materia (Todos los roles, Criterio 9, 10, 11) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-materia-select"
            className="text-xs font-semibold text-gray-700"
          >
            Materia
          </label>
          <Select
            value={filtros.materiaId || "TODAS"}
            onValueChange={handleMateriaChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="filtro-materia-select"
              className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
            >
              <SelectValue placeholder={placeholderMateria} />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="TODAS">{placeholderMateria}</SelectItem>
              {materiasDisponibles.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 6. Examen (Todos los roles, Criterio 10) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-examen-select"
            className="text-xs font-semibold text-gray-700"
          >
            Examen
          </label>
          <Select
            value={filtros.examenId || "TODOS"}
            onValueChange={handleExamenChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="filtro-examen-select"
              className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
            >
              <SelectValue placeholder="Todos los exámenes" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="TODOS">Todos los exámenes</SelectItem>
              {examenesDisponibles.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {labelExamen(ex)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 7. Motivo (Todos los roles, Criterio 14) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-motivo-select"
            className="text-xs font-semibold text-gray-700"
          >
            Motivo
          </label>
          <Select
            value={filtros.motivo || "TODOS"}
            onValueChange={handleMotivoChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="filtro-motivo-select"
              className="w-full h-10 rounded-xl bg-white border-gray-200 text-xs"
            >
              <SelectValue placeholder="Todos los motivos" />
            </SelectTrigger>
            <SelectContent position="popper">
              {MOTIVOS_FILTRO_OPCIONES.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
