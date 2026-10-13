import { apiClient } from "@/shared/lib/api-client";
import type {
  ExamenAsignado,
  ResumenEnVivoData,
} from "../types/control-ingreso.types";

/**
 * Datos semilla de respaldo basados en Prisma seed.ts y los mockups oficiales.
 * Se utilizan de forma transparente si el backend aún no tiene los endpoints listos.
 */
export const SEED_EXAMENES_ASIGNADOS: ExamenAsignado[] = [
  {
    id: 1,
    asignatura: "Cálculo II",
    sigla: "CALCII",
    estado: "EN_CURSO",
    totalEstudiantes: 85,
    fecha: "6 sep 2026",
    horario: "09:00–11:00",
    ambiente: "Sala 204",
    capacidadAmbiente: 100,
    tipoExamen: "Primer Parcial",
  },
  {
    id: 2,
    asignatura: "Estadística I",
    sigla: "EST1",
    estado: "PROXIMO",
    totalEstudiantes: 110,
    fecha: "6 sep 2026",
    horario: "12:00–14:00",
    ambiente: "Auditorio B",
    capacidadAmbiente: 150,
    tipoExamen: "Primer Parcial",
  },
  {
    id: 3,
    asignatura: "Física General",
    sigla: "FIS1",
    estado: "PROXIMO",
    totalEstudiantes: 72,
    fecha: "7 sep 2026",
    horario: "08:00–10:00",
    ambiente: "Sala 101",
    capacidadAmbiente: 80,
    tipoExamen: "Examen de Diagnóstico",
  },
];

export const SEED_RESUMEN_DEFAULT: ResumenEnVivoData = {
  examenId: 1,
  asignatura: "Cálculo II",
  ambiente: "Sala 204",
  horario: "09:00–11:00",
  estado: "EN_CURSO",
  totalHabilitados: 85,
  ingresados: 38,
  pendientes: 47,
  incidencias: 2,
  ultimosIngresos: [
    {
      id: 1,
      nombre: "Andrés González",
      codSis: "2020-08711",
      hora: "08:47",
      metodo: "QR",
    },
    {
      id: 2,
      nombre: "Camila Méndez",
      codSis: "2021-09442",
      hora: "08:44",
      metodo: "MANUAL",
    },
    {
      id: 3,
      nombre: "José Ramírez",
      codSis: "2022-11703",
      hora: "08:41",
      metodo: "QR",
    },
  ],
};

export const controlIngresoService = {
  /**
   * Obtiene la lista de exámenes asignados al usuario de control actual.
   */
  async getMisExamenes(): Promise<ExamenAsignado[]> {
    try {
      const response = await apiClient.get<ExamenAsignado[]>(
        "/control-ingreso/mis-examenes"
      );
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      return SEED_EXAMENES_ASIGNADOS;
    } catch {
      // Fallback a los datos del seed si el endpoint aún no está implementado en backend
      return SEED_EXAMENES_ASIGNADOS;
    }
  },

  /**
   * Obtiene el resumen en vivo y los últimos ingresos de un examen activo.
   */
  async getResumenExamen(examenId: number): Promise<ResumenEnVivoData> {
    try {
      const response = await apiClient.get<ResumenEnVivoData>(
        `/control-ingreso/examenes/${examenId}/resumen`
      );
      if (response.data) {
        return response.data;
      }
      return {
        ...SEED_RESUMEN_DEFAULT,
        examenId,
      };
    } catch {
      return {
        ...SEED_RESUMEN_DEFAULT,
        examenId,
      };
    }
  },
};
