"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Exam,
  ExamFilters,
  MateriaOption,
  AmbienteOption,
} from "../types/exam.types";
import { ExamFormValues } from "../schemas/exam.schema";
import { dbService } from "@/shared/lib/db/indexedDB";

export const MOCK_MATERIAS: MateriaOption[] = [
  {
    id: "mat-1",
    nombre: "Base de Datos I",
    carreraId: "car-sistemas",
    carreraNombre: "Ingeniería de Sistemas",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
  },
  {
    id: "mat-2",
    nombre: "Cálculo I",
    carreraId: "car-sistemas",
    carreraNombre: "Ingeniería de Sistemas",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
  },
  {
    id: "mat-3",
    nombre: "Programación Web",
    carreraId: "car-informatica",
    carreraNombre: "Ingeniería Informática",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
  },
  {
    id: "mat-4",
    nombre: "Física General",
    carreraId: "car-industrial",
    carreraNombre: "Ingeniería Industrial",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
  },
  {
    id: "mat-5",
    nombre: "Contabilidad Básica",
    carreraId: "car-administracion",
    carreraNombre: "Administración de Empresas",
    facultadId: "fac-fce",
    facultadNombre: "Facultad de Ciencias Económicas",
  },
];

export const MOCK_AMBIENTES: AmbienteOption[] = [
  {
    id: "amb-1",
    nombre: "Laboratorio 3 - Piso 2",
    horarioDisponible: "2026-09-22 | 08:15 - 09:45",
  },
  {
    id: "amb-2",
    nombre: "Aula Magna - Bloque Central",
    horarioDisponible: "2026-09-22 | 10:00 - 11:30",
  },
  {
    id: "amb-3",
    nombre: "Auditorio FCT",
    horarioDisponible: "2026-09-23 | 14:00 - 15:30",
  },
  {
    id: "amb-4",
    nombre: "Aula 204 - Bloque B",
    horarioDisponible: "2026-09-24 | 16:00 - 17:30",
  },
];

// Datos iniciales de demostración con diferentes fechas de creación para probar la regla de 24h
export const MOCK_EXAMS: Exam[] = [
  {
    id: "ex-1",
    materiaId: "mat-1",
    materiaNombre: "Base de Datos I",
    carreraId: "car-sistemas",
    carreraNombre: "Ingeniería de Sistemas",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
    tipoExamen: "Primer parcial",
    ambienteId: "amb-1",
    ambienteNombre: "Laboratorio 3 - Piso 2",
    fecha: "2026-09-22",
    horaInicio: "08:15",
    horaFin: "09:45",
    duracionMinutos: 90,
    habilitadosCount: 45,
    normas: "No se permite el uso de celulares. Carnet de identidad obligatorio.",
    docenteId: "doc-1",
    docenteNombre: "Lic. Andrea Coca",
    estado: "Programado",
    // Creado hoy (hace 2 horas) => Muestra botón "Cancelar" (eliminación física)
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ex-2",
    materiaId: "mat-2",
    materiaNombre: "Cálculo I",
    carreraId: "car-sistemas",
    carreraNombre: "Ingeniería de Sistemas",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
    tipoExamen: "Primer parcial",
    ambienteId: "amb-2",
    ambienteNombre: "Aula Magna - Bloque Central",
    fecha: "2026-09-18",
    horaInicio: "14:00",
    horaFin: "15:30",
    duracionMinutos: 90,
    habilitadosCount: 60,
    normas: "Carnet en el pupitre. Prohibido hablar o prestar útiles.",
    docenteId: "doc-1",
    docenteNombre: "Lic. Andrea Coca",
    estado: "En curso",
    // Creado hace 3 días (>24h) => Muestra botón "Desactivar" (baja lógica)
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ex-3",
    materiaId: "mat-3",
    materiaNombre: "Programación Web",
    carreraId: "car-informatica",
    carreraNombre: "Ingeniería Informática",
    facultadId: "fac-fct",
    facultadNombre: "Facultad de Ciencias y Tecnología",
    tipoExamen: "Segundo parcial",
    ambienteId: "amb-3",
    ambienteNombre: "Auditorio FCT",
    fecha: "2026-09-15",
    horaInicio: "09:45",
    horaFin: "11:15",
    duracionMinutos: 90,
    habilitadosCount: 38,
    normas: "Examen práctico en laboratorio.",
    docenteId: "doc-2",
    docenteNombre: "Ing. Carlos Mendoza",
    estado: "Finalizado",
    createdAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ex-4",
    materiaId: "mat-5",
    materiaNombre: "Contabilidad Básica",
    carreraId: "car-administracion",
    carreraNombre: "Administración de Empresas",
    facultadId: "fac-fce",
    facultadNombre: "Facultad de Ciencias Económicas",
    tipoExamen: "Examen final",
    ambienteId: "amb-4",
    ambienteNombre: "Aula 204 - Bloque B",
    fecha: "2026-09-25",
    horaInicio: "16:00",
    horaFin: "17:30",
    duracionMinutos: 90,
    habilitadosCount: 52,
    normas: "Calculadora simple autorizada.",
    docenteId: "doc-3",
    docenteNombre: "Lic. Roberto Gómez",
    estado: "Programado",
    // Creado hace 48 horas (>24h) => Muestra botón "Desactivar" (baja lógica)
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filters, setFilters] = useState<ExamFilters>({
    facultadId: "",
    carreraId: "",
    materiaId: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Inicializar estado de conexión y listener de red
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Cargar exámenes desde IndexedDB (o sembrar datos iniciales si la BD está vacía)
  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined") {
        const storedExams = await dbService.getAllExams();
        if (storedExams.length > 0) {
          setExams(storedExams);
        } else {
          // Primera vez: sembrar Mock Data en IndexedDB
          await dbService.saveAllExams(MOCK_EXAMS);
          setExams(MOCK_EXAMS);
        }
      } else {
        setExams(MOCK_EXAMS);
      }
    } catch (err) {
      console.warn("No se pudo acceder a IndexedDB, usando memoria local:", err);
      setExams(MOCK_EXAMS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Excluir exámenes en estado 'Desactivado' (baja lógica)
      if (exam.estado === "Desactivado") return false;

      if (filters.facultadId && exam.facultadId !== filters.facultadId) {
        return false;
      }
      if (filters.carreraId && exam.carreraId !== filters.carreraId) {
        return false;
      }
      if (filters.materiaId && exam.materiaId !== filters.materiaId) {
        return false;
      }
      if (filters.fechaInicio && exam.fecha < filters.fechaInicio) {
        return false;
      }
      if (filters.fechaFin && exam.fecha > filters.fechaFin) {
        return false;
      }
      return true;
    });
  }, [exams, filters]);

  const createExam = async (values: ExamFormValues) => {
    const materia = MOCK_MATERIAS.find((m) => m.id === values.materiaId);
    const ambiente = MOCK_AMBIENTES.find((a) => a.id === values.ambienteId);

    let fecha = new Date().toISOString().split("T")[0];
    let horaInicio = "08:00";
    let horaFin = "09:30";

    if (ambiente?.horarioDisponible) {
      const parts = ambiente.horarioDisponible.split("|").map((s) => s.trim());
      if (parts[0]) fecha = parts[0];
      if (parts[1]) {
        const hours = parts[1].split("-").map((h) => h.trim());
        if (hours[0]) horaInicio = hours[0];
        if (hours[1]) horaFin = hours[1];
      }
    }

    const newExam: Exam = {
      id: `ex-${Date.now()}`,
      materiaId: values.materiaId,
      materiaNombre: materia ? materia.nombre : "Materia no especificada",
      carreraId: materia ? materia.carreraId : "",
      carreraNombre: materia ? materia.carreraNombre : "",
      facultadId: materia ? materia.facultadId : "",
      facultadNombre: materia ? materia.facultadNombre : "",
      tipoExamen: values.tipoExamen,
      ambienteId: values.ambienteId,
      ambienteNombre: ambiente ? ambiente.nombre : "Ambiente reservado",
      fecha,
      horaInicio,
      horaFin,
      duracionMinutos: 90,
      habilitadosCount: 40,
      normas: values.normas,
      docenteId: "doc-actual",
      docenteNombre: "Docente Actual",
      estado: "Programado",
      createdAt: new Date().toISOString(), // Fecha/hora de creación actual
    };

    // Actualizar estado en memoria
    setExams((prev) => [newExam, ...prev]);

    // Persistir en IndexedDB (soporte offline garantizado)
    try {
      await dbService.saveExam(newExam);
    } catch (err) {
      console.error("Error guardando examen en IndexedDB:", err);
    }

    return newExam;
  };

  const cancelExam = async (examId: string, hardDelete: boolean) => {
    if (hardDelete) {
      // Eliminación física (creado hace menos de 24 hrs)
      setExams((prev) => prev.filter((e) => e.id !== examId));
      try {
        await dbService.deleteExam(examId);
      } catch (err) {
        console.error("Error eliminando examen de IndexedDB:", err);
      }
    } else {
      // Baja lógica (creado hace 24 hrs o más) -> Cambia a estado "Desactivado"
      const targetExam = exams.find((e) => e.id === examId);
      if (targetExam) {
        const updatedExam: Exam = { ...targetExam, estado: "Desactivado" };
        setExams((prev) =>
          prev.map((e) => (e.id === examId ? updatedExam : e))
        );
        try {
          await dbService.saveExam(updatedExam);
        } catch (err) {
          console.error("Error actualizando estado en IndexedDB:", err);
        }
      }
    }
  };

  return {
    exams,
    filteredExams,
    filters,
    setFilters,
    createExam,
    cancelExam,
    isLoading,
    isOnline,
    reloadExams: loadExams,
  };
}
