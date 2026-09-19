"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import { getSession } from "next-auth/react";
import {
  Exam,
  ExamType,
  ExamStatus,
  ExamFilters,
  MateriaOption,
  AmbienteOption,
} from "../types/exam.types";
import { ExamFormValues } from "../schemas/exam.schema";
import { dbService } from "@/shared/lib/db/indexedDB";

// Tipado seguro para la sesión de NextAuth (sin usar any)
interface CustomSession {
  accessToken?: string;
  token?: string;
  user?: {
    token?: string;
    accessToken?: string;
  };
}

// Tipado seguro para la respuesta del Backend
interface BackendExamResponse {
  id: string | number;
  materiaId?: string | number;
  materiaNombre?: string;
  materia?: {
    id?: string | number;
    nombre?: string;
    carrera?: {
      id?: string | number;
      nombre?: string;
      facultad?: { id?: string | number; nombre?: string };
    };
  };
  carreraId?: string | number;
  carreraNombre?: string;
  carrera?: {
    id?: string | number;
    nombre?: string;
    facultad?: { id?: string | number; nombre?: string };
  };
  facultadId?: string | number;
  facultadNombre?: string;
  facultad?: { id?: string | number; nombre?: string };
  tipoExamen?: ExamType;
  ambienteId?: string | number;
  ambienteNombre?: string;
  ambiente?: { id?: string | number; nombre?: string };
  duracionMinutos?: number;
  docenteId?: string | number;
  docenteNombre?: string;
  docente?: {
    id?: string | number;
    nombre?: string;
    apellido?: string;
  };
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  estado?: ExamStatus;
  habilitadosCount?: number;
  estudiantes?: unknown[];
  createdAt?: string;
  normas?: string;
  isEdited?: boolean;
}

interface BackendMateriaResponse {
  id: string | number;
  nombre: string;
  carreraId?: string | number;
  carreraNombre?: string;
  carrera?: {
    id?: string | number;
    nombre?: string;
    facultadId?: string | number;
    facultad?: { id?: string | number; nombre?: string };
  };
  facultadId?: string | number;
  facultadNombre?: string;
}

interface BackendAmbienteResponse {
  id: string | number;
  nombre: string;
  horarioDisponible?: string;
}

// URL base de NestJS (puerto 3001)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [ambientes, setAmbientes] = useState<AmbienteOption[]>([]);
  const [filters, setFilters] = useState<ExamFilters>({
    facultadId: "",
    carreraId: "",
    materiaId: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Obtener headers de autenticación con el token de NextAuth
  const getAuthHeaders = async () => {
    try {
      const session = (await getSession()) as CustomSession | null;
      const token =
        session?.accessToken || session?.token || session?.user?.token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  // Detector de conexión a internet
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

  // 1. Cargar exámenes del Backend
  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        const headers = await getAuthHeaders();
        const response = await axios.get<BackendExamResponse[]>(
          `${API_URL}/examenes`,
          { headers, withCredentials: true }
        );

        const data = response.data || [];
        const mappedExams: Exam[] = data.map((e): Exam => ({
          id: String(e.id),
          materiaId: String(e.materiaId || e.materia?.id || ""),
          materiaNombre: e.materiaNombre || e.materia?.nombre || "Materia",
          carreraId: String(e.carreraId || e.carrera?.id || e.materia?.carrera?.id || ""),
          carreraNombre: e.carreraNombre || e.carrera?.nombre || e.materia?.carrera?.nombre || "",
          facultadId: String(e.facultadId || e.facultad?.id || e.materia?.carrera?.facultad?.id || ""),
          facultadNombre: e.facultadNombre || e.facultad?.nombre || e.materia?.carrera?.facultad?.nombre || "",
          tipoExamen: (e.tipoExamen as ExamType) || "Primer parcial",
          ambienteId: String(e.ambienteId || e.ambiente?.id || ""),
          ambienteNombre: e.ambienteNombre || e.ambiente?.nombre || "Aula asignada",
          fecha: e.fecha ? String(e.fecha).split("T")[0] : "",
          horaInicio: e.horaInicio || "08:00",
          horaFin: e.horaFin || "09:30",
          duracionMinutos: Number(e.duracionMinutos || 90),
          habilitadosCount: Number(e.habilitadosCount ?? (e.estudiantes?.length ?? 0)),
          normas: e.normas || "",
          docenteId: String(e.docenteId || e.docente?.id || ""),
          docenteNombre:
            e.docenteNombre ||
            (e.docente
              ? `${e.docente.nombre || ""} ${e.docente.apellido || ""}`.trim()
              : "Docente asignado"),
          estado: (e.estado as ExamStatus) || "Programado",
          createdAt: e.createdAt ? String(e.createdAt) : new Date().toISOString(),
          isEdited: Boolean(e.isEdited),
        }));

        setExams(mappedExams);
        await dbService.saveAllExams(mappedExams);
      } else {
        const offlineExams = await dbService.getAllExams();
        setExams(offlineExams);
      }
    } catch (err) {
      console.warn("Backend no disponible, cargando datos locales:", err);
      const offlineExams = await dbService.getAllExams();
      setExams(offlineExams);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Cargar materias
  const loadMaterias = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get<BackendMateriaResponse[]>(
        `${API_URL}/materias`,
        { headers, withCredentials: true }
      );
      const data = response.data || [];
      const mapped: MateriaOption[] = data.map((m) => ({
        id: String(m.id),
        nombre: m.nombre,
        carreraId: String(m.carreraId || m.carrera?.id || ""),
        carreraNombre: m.carreraNombre || m.carrera?.nombre || "",
        facultadId: String(m.facultadId || m.carrera?.facultadId || ""),
        facultadNombre: m.facultadNombre || m.carrera?.facultad?.nombre || "",
      }));
      setMaterias(mapped);
    } catch (err) {
      console.warn("Endpoint /materias pendiente de implementación:", err);
    }
  }, []);

  // 3. Cargar ambientes
  const loadAmbientes = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get<BackendAmbienteResponse[]>(
        `${API_URL}/ambientes`,
        { headers, withCredentials: true }
      );
      const data = response.data || [];
      const mapped: AmbienteOption[] = data.map((a) => ({
        id: String(a.id),
        nombre: a.nombre,
        horarioDisponible: a.horarioDisponible || "2026-09-20 | 08:00 - 09:30",
      }));
      setAmbientes(mapped);
    } catch (err) {
      console.warn("Aviso: no se pudieron cargar ambientes del backend:", err);
    }
  }, []);

  useEffect(() => {
    loadExams();
    loadMaterias();
    loadAmbientes();
  }, [loadExams, loadMaterias, loadAmbientes]);

  // Filtros dinámicos
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (filters.facultadId && exam.facultadId !== filters.facultadId) return false;
      if (filters.carreraId && exam.carreraId !== filters.carreraId) return false;
      if (filters.materiaId && exam.materiaId !== filters.materiaId) return false;
      if (filters.fechaInicio && exam.fecha < filters.fechaInicio) return false;
      if (filters.fechaFin && exam.fecha > filters.fechaFin) return false;
      return true;
    });
  }, [exams, filters]);

  // Crear examen
  const createExam = async (values: ExamFormValues) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post<Exam>(`${API_URL}/examenes`, values, {
        headers,
        withCredentials: true,
      });
      const newExam = response.data;
      setExams((prev) => [newExam, ...prev]);
      await dbService.saveExam(newExam);
      return newExam;
    } catch (err) {
      console.error("Error creando examen en NestJS:", err);
      throw err;
    }
  };

  // Editar examen (PATCH)
  const updateExam = async (examId: string, values: ExamFormValues) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.patch<Exam>(
        `${API_URL}/examenes/${examId}`,
        values,
        { headers, withCredentials: true }
      );
      const updatedExam: Exam = { ...response.data, isEdited: true };
      setExams((prev) => prev.map((e) => (e.id === examId ? updatedExam : e)));
      await dbService.saveExam(updatedExam);
      return updatedExam;
    } catch (err) {
      console.error("Error editando examen en NestJS:", err);
      throw err;
    }
  };

  // Cancelar o desactivar examen
  const cancelExam = async (examId: string, hardDelete: boolean) => {
    try {
      const headers = await getAuthHeaders();
      if (hardDelete) {
        await axios.delete(`${API_URL}/examenes/${examId}`, {
          headers,
          withCredentials: true,
        });
        setExams((prev) => prev.filter((e) => e.id !== examId));
        await dbService.deleteExam(examId);
      } else {
        const response = await axios.patch<Exam>(
          `${API_URL}/examenes/${examId}`,
          { estado: "Desactivado" },
          { headers, withCredentials: true }
        );
        const updated: Exam = response.data;
        setExams((prev) => prev.map((e) => (e.id === examId ? updated : e)));
        await dbService.saveExam(updated);
      }
    } catch (err) {
      console.error("Error cancelando examen en NestJS:", err);
      throw err;
    }
  };

  return {
    exams,
    materias,
    ambientes,
    filteredExams,
    filters,
    setFilters,
    createExam,
    updateExam,
    cancelExam,
    isLoading,
    isOnline,
    reloadExams: loadExams,
  };
}