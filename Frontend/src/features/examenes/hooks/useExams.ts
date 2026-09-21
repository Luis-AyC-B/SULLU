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

// Tipado seguro para la sesión de NextAuth
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
  reservaAmbienteId?: string | number;
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
  estado?: ExamStatus | string;
  habilitadosCount?: number;
  estudiantes?: unknown[];
  createdAt?: string;
  normas?: string;
  fueEditado?: boolean;
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

// Respuesta de GET /examenes/mis-ambientes: una fila por RESERVA del docente
interface BackendAmbienteResponse {
  reservaAmbienteId: string | number;
  ambienteId: string | number;
  ambienteNombre: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
}

// Función para normalizar cualquier fecha a "AAAA-MM-DD" sin desfases de zona horaria
export const normalizeDateString = (val: unknown): string => {
  if (!val) return "";
  const str = String(val).trim();

  // 1. Si contiene AAAA-MM-DD (ej: "2026-09-20" o "2026-09-20T...")
  const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // 2. Si viene en formato DD/MM/AAAA o DD-MM-AAAA (ej: "20/09/2026")
  const slashMatch = str.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }

  // 3. Si viene como Date string en inglés (ej: "Sun Sep 20 2026...")
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
};

// ← FIX: Normaliza el estado que venga del backend (cualquier mayúscula/minúscula
// o sinónimo) al string EXACTO que espera el front ("Programado", "En curso",
// "Finalizado", "Desactivado"). Si el backend manda una variante nueva que no
// está en el mapa, avisa por consola en vez de fallar en silencio.
export const normalizeEstado = (val: unknown): ExamStatus => {
  const str = String(val ?? "").trim().toUpperCase();

  const map: Record<string, ExamStatus> = {
    PROGRAMADO: "Programado",
    "EN CURSO": "En curso",
    EN_CURSO: "En curso",
    FINALIZADO: "Finalizado",
    DESACTIVADO: "Desactivado",
    CANCELADO: "Desactivado",
    INACTIVO: "Desactivado",
  };

  if (!str) return "Programado";

  const normalized = map[str];
  if (!normalized) {
    console.warn(`[normalizeEstado] Estado desconocido recibido del backend: "${val}". Cae a "Programado".`);
    return "Programado";
  }
  return normalized;
};

// URL base de NestJS (puerto 3001)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// El select del formulario guarda en "ambienteId" el id de la RESERVA elegida;
// el backend espera ese valor como "reservaAmbienteId".
const toPayload = ({ ambienteId, ...rest }: ExamFormValues) => ({
  ...rest,
  reservaAmbienteId: Number(ambienteId),
});

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
        session?.accessToken || session?.token ||  session?.user?.accessToken || session?.user?.token;
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
        const response = await axios.get<BackendExamResponse[] | { data: BackendExamResponse[] }>(
          `${API_URL}/examenes`,
          { headers, withCredentials: true }
        );

        const rawData = response.data;
        let data: BackendExamResponse[] = [];
        if (Array.isArray(rawData)) {
          data = rawData;
        } else if (rawData && typeof rawData === "object" && "data" in rawData && Array.isArray(rawData.data)) {
          data = rawData.data;
        }

        const mappedExams: Exam[] = data.map((e): Exam => ({
          id: String(e.id),
          materiaId: String(e.materiaId || e.materia?.id || ""),
          materiaNombre: e.materiaNombre || e.materia?.nombre || "Materia",
          carreraId: String(e.carreraId || e.carrera?.id || e.materia?.carrera?.id || ""),
          carreraNombre: e.carreraNombre || e.carrera?.nombre || e.materia?.carrera?.nombre || "",
          facultadId: String(e.facultadId || e.facultad?.id || e.materia?.carrera?.facultad?.id || ""),
          facultadNombre: e.facultadNombre || e.facultad?.nombre || e.materia?.carrera?.facultad?.nombre || "",
          tipoExamen: (e.tipoExamen as ExamType) || "Primer parcial",
          // Se prioriza el id de la reserva: es el valor que usa el select del formulario
          ambienteId: String(e.reservaAmbienteId || e.ambienteId || e.ambiente?.id || ""),
          ambienteNombre: e.ambienteNombre || e.ambiente?.nombre || "Aula asignada",
          fecha: normalizeDateString(e.fecha) || "2026-09-20",
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
          estado: normalizeEstado(e.estado),
          createdAt: e.createdAt ? String(e.createdAt) : new Date().toISOString(),
          fueEditado: Boolean(e.fueEditado ?? e.isEdited),
          isEdited: Boolean(e.fueEditado ?? e.isEdited),
        }));

        setExams(mappedExams);
        await dbService.saveAllExams(mappedExams);
      } else {
        const offlineExams = await dbService.getAllExams();
        setExams(Array.isArray(offlineExams) ? offlineExams : []);
      }
    } catch (err) {
      console.warn("Backend no disponible, cargando datos locales:", err);
      const offlineExams = await dbService.getAllExams();
      setExams(Array.isArray(offlineExams) ? offlineExams : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Cargar materias
  const loadMaterias = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get<BackendMateriaResponse[] | { data: BackendMateriaResponse[] }>(
        `${API_URL}/materias`,
        { headers, withCredentials: true }
      );
      const rawData = response.data;
      let data: BackendMateriaResponse[] = [];
      if (Array.isArray(rawData)) {
        data = rawData;
      } else if (rawData && typeof rawData === "object" && "data" in rawData && Array.isArray(rawData.data)) {
        data = rawData.data;
      }

      const mapped: MateriaOption[] = data.map((m) => ({
      id: String(m.id),
      nombre: m.nombre,
      carreraId: String(m.carreraId ?? m.carrera?.id ?? ""),
      carreraNombre: m.carreraNombre || m.carrera?.nombre || "",
      facultadId: String(m.facultadId ?? m.carrera?.facultadId ?? m.carrera?.facultad?.id ?? ""),
      facultadNombre: m.facultadNombre || m.carrera?.facultad?.nombre || "",
    }));
      setMaterias(mapped);
    } catch (err) {
      console.warn("Endpoint /materias pendiente de implementación:", err);
      setMaterias([]);
    }
  }, []);

  // 3. Cargar ambientes RESERVADOS por el docente (una opción por reserva)
  const loadAmbientes = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get<BackendAmbienteResponse[] | { data: BackendAmbienteResponse[] }>(
        `${API_URL}/examenes/mis-ambientes`,
        { headers, withCredentials: true }
      );
      const rawData = response.data;
      let data: BackendAmbienteResponse[] = [];
      if (Array.isArray(rawData)) {
        data = rawData;
      } else if (rawData && typeof rawData === "object" && "data" in rawData && Array.isArray(rawData.data)) {
        data = rawData.data;
      }

      const mapped: AmbienteOption[] = data.map((a) => ({
        id: String(a.reservaAmbienteId),
        nombre: a.ambienteNombre,
        horarioDisponible: `${a.fecha ?? ""} | ${a.horaInicio ?? ""} - ${a.horaFin ?? ""}`,
      }));
      setAmbientes(mapped);
    } catch (err) {
      console.warn("Aviso: no se pudieron cargar los ambientes reservados:", err);
      setAmbientes([]);
    }
  }, []);

  useEffect(() => {
    loadExams();
    loadMaterias();
    loadAmbientes();
  }, [loadExams, loadMaterias, loadAmbientes]);

  // Filtros dinámicos (soporta coincidencia exacta del mismo día y rangos de fechas)
  const filteredExams = useMemo(() => {
    if (!Array.isArray(exams)) return [];

    const startDate = normalizeDateString(filters.fechaInicio);
    const endDate = normalizeDateString(filters.fechaFin);

    return exams.filter((exam) => {
      if (filters.facultadId && exam.facultadId !== filters.facultadId) return false;
      if (filters.carreraId && exam.carreraId !== filters.carreraId) return false;
      if (filters.materiaId && exam.materiaId !== filters.materiaId) return false;

      const examDate = normalizeDateString(exam.fecha);

      // Si la fecha fin es menor a fecha inicio (rango inválido), no mostrar nada
      if (startDate && endDate && endDate < startDate) {
        return false;
      }

      // CASO ESPECIAL: Si ambos filtros tienen el MISMO día seleccionado (ej: 20/09/2026 y 20/09/2026)
      if (startDate && endDate && startDate === endDate) {
        return examDate === startDate;
      }

      // Rango normal
      if (startDate && examDate && examDate < startDate) {
        return false;
      }
      if (endDate && examDate && examDate > endDate) {
        return false;
      }

      return true;
    });
  }, [exams, filters]);

  // Crear examen
  const createExam = async (values: ExamFormValues) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post<Exam>(
        `${API_URL}/examenes`,
        toPayload(values),
        {
          headers,
          withCredentials: true,
        }
      );
      const newExam: Exam = {
        ...response.data,
        // Se conserva el id de la reserva para que coincida con el select del formulario
        ambienteId: values.ambienteId,
        fecha: normalizeDateString(response.data.fecha) || "2026-09-20",
        createdAt: response.data.createdAt || new Date().toISOString(),
        estado: normalizeEstado(response.data.estado),
      };
      setExams((prev) => (Array.isArray(prev) ? [newExam, ...prev] : [newExam]));
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
        toPayload(values),
        { headers, withCredentials: true }
      );

      const existingExam = Array.isArray(exams) ? exams.find((e) => e.id === examId) : undefined;
      const updatedExam: Exam = {
        ...(existingExam || ({} as Exam)),
        ...response.data,
        ambienteId: values.ambienteId,
        fecha: normalizeDateString(response.data.fecha || existingExam?.fecha),
        estado: normalizeEstado(response.data.estado ?? existingExam?.estado), // ← FIX
        id: String(examId),
        fueEditado: true,
        isEdited: true,
      };

      setExams((prev) =>
        Array.isArray(prev) ? prev.map((e) => (e.id === examId ? updatedExam : e)) : [updatedExam]
      );
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
        setExams((prev) => (Array.isArray(prev) ? prev.filter((e) => e.id !== examId) : []));
        await dbService.deleteExam(examId);
      } else {
        let responseData: Partial<Exam> = {};
        try {
          const response = await axios.patch<Exam>(
            `${API_URL}/examenes/${examId}`,
            { estado: "CANCELADO" },
            { headers, withCredentials: true }
          );
          responseData = response.data;
        } catch {
          const fallbackResponse = await axios.patch<Exam>(
            `${API_URL}/examenes/${examId}`,
            { estado: "Desactivado" },
            { headers, withCredentials: true }
          );
          responseData = fallbackResponse.data;
        }

        setExams((prev) =>
          (Array.isArray(prev) ? prev : []).map((e) => {
            if (e.id === examId) {
              const updated: Exam = {
                ...e,
                ...responseData,
                id: String(examId),
                // ← FIX: se fuerza "Desactivado" pasado por normalizeEstado para
                // mantener consistencia de tipo. Si el backend NO persiste este
                // cambio, al refrescar (loadExams) el estado real que vuelva del
                // servidor pisará esto — eso ya no es un bug de front, hay que
                // confirmarlo con el backend.
                estado: normalizeEstado("DESACTIVADO"),
                fueEditado: false,
                isEdited: false,
              };
              dbService.saveExam(updated);
              return updated;
            }
            return e;
          })
        );
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