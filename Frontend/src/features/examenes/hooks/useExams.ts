"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Exam,
  ExamFilters,
  MateriaOption,
  AmbienteOption,
} from "../types/exam.types";
import { ExamFormValues } from "../schemas/exam.schema";
import { dbService } from "@/shared/lib/db/indexedDB";

// URL base del backend (ajústala cuando tu compañero te dé el puerto, ej: http://localhost:8000/api)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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

  // 1. Cargar exámenes (del Backend o de IndexedDB si está offline)
  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        // Petición al Backend real
        const response = await axios.get(`${API_URL}/examenes`);
        setExams(response.data);
        // Guardar respaldo en IndexedDB
        await dbService.saveAllExams(response.data);
      } else {
        // Sin conexión: cargar desde IndexedDB
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

  // 2. Cargar catálogo de Materias asignadas
  const loadMaterias = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/materias`);
      setMaterias(response.data);
    } catch (err) {
      console.warn("No se pudieron cargar materias del backend:", err);
    }
  }, []);

  // 3. Cargar catálogo de Ambientes reservados
  const loadAmbientes = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/ambientes`);
      setAmbientes(response.data);
    } catch (err) {
      console.warn("No se pudieron cargar ambientes del backend:", err);
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

  // Crear examen con el Backend
  const createExam = async (values: ExamFormValues) => {
    try {
      const response = await axios.post(`${API_URL}/examenes`, values);
      const newExam = response.data;
      setExams((prev) => [newExam, ...prev]);
      await dbService.saveExam(newExam);
      return newExam;
    } catch (err) {
      console.error("Error creando examen en el backend:", err);
      throw err;
    }
  };

  // Editar examen con el Backend
  const updateExam = async (examId: string, values: ExamFormValues) => {
    try {
      const response = await axios.put(`${API_URL}/examenes/${examId}`, values);
      const updatedExam = { ...response.data, isEdited: true };
      setExams((prev) => prev.map((e) => (e.id === examId ? updatedExam : e)));
      await dbService.saveExam(updatedExam);
      return updatedExam;
    } catch (err) {
      console.error("Error editando examen en el backend:", err);
      throw err;
    }
  };

  // Cancelar o desactivar examen con el Backend
  const cancelExam = async (examId: string, hardDelete: boolean) => {
    try {
      if (hardDelete) {
        // Eliminación física
        await axios.delete(`${API_URL}/examenes/${examId}`);
        setExams((prev) => prev.filter((e) => e.id !== examId));
        await dbService.deleteExam(examId);
      } else {
        // Baja lógica
        const response = await axios.patch(`${API_URL}/examenes/${examId}/desactivar`);
        const updated = response.data;
        setExams((prev) => prev.map((e) => (e.id === examId ? updated : e)));
        await dbService.saveExam(updated);
      }
    } catch (err) {
      console.error("Error cancelando examen en el backend:", err);
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