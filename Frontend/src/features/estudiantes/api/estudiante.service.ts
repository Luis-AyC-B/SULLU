import { apiClient } from "@/shared/lib/api-client";
import {
  CreateEstudianteManualInput,
  EstudianteExamen,
  ExamenItem,
} from "../types/estudiante.types";

export interface BackendExamenDto {
  examen_id: number;
  materia: string | null;
  materia_sigla: string | null;
  tipo_examen: string;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  ambiente: string | null;
  estado: string | null;
}

export interface GetEstudiantesResponse {
  total: number;
  page?: number;
  limit?: number;
  data: EstudianteExamen[];
}

export interface CargaMasivaBackendResponse {
  resumen: {
    total_filas: number;
    procesadas: number;
    rechazadas: number;
    estudiantes_creados: number;
    estudiantes_reutilizados: number;
    vinculados_nuevos: number;
    ya_vinculados: number;
  };
  rechazados: Array<{
    fila: number;
    cod_sis: string | null;
    motivo: string;
  }>;
}

export const estudianteService = {
  /**
   * Task 14: Obtiene los exámenes disponibles para el selector (GET /examenes).
   */
  getExamenes: async (q?: string): Promise<ExamenItem[]> => {
    const { data } = await apiClient.get<BackendExamenDto[]>("/examenes", {
      params: q ? { q } : undefined,
    });

    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      let fechaFormatted = "";
      if (item.fecha) {
        try {
          const dateObj = new Date(item.fecha);
          fechaFormatted = dateObj.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        } catch {
          fechaFormatted = String(item.fecha);
        }
      }

      return {
        id: item.examen_id,
        nombreMateria: item.materia || "Examen",
        sigla: item.materia_sigla || "",
        fecha: fechaFormatted || "Sin fecha",
      };
    });
  },

  /**
   * Task 7: Obtiene la lista de estudiantes de un examen específico (GET /examenes/:examenId/estudiantes).
   */
  getEstudiantesByExamen: async (
    examenId: number,
    params?: { q?: string; estado?: string; page?: number; limit?: number }
  ): Promise<GetEstudiantesResponse> => {
    const { data } = await apiClient.get<GetEstudiantesResponse>(
      `/examenes/${examenId}/estudiantes`,
      { params }
    );
    return data;
  },

  /**
   * Task 9: Registra manualmente a un estudiante en el examen específico (POST /examenes/:examenId/estudiantes).
   */
  registrarManual: async (
    examenId: number,
    payload: CreateEstudianteManualInput
  ): Promise<{
    estudiante: EstudianteExamen;
    estudiante_reutilizado?: boolean;
    advertencia?: string;
  }> => {
    const { data } = await apiClient.post(
      `/examenes/${examenId}/estudiantes`,
      payload
    );
    return data;
  },

  /**
   * Task 10: Actualiza el estado de habilitación de un estudiante (PATCH /examenes/:examenId/estudiantes/:estudianteId/estado).
   * Cuando estado_habilitado === false, motivo_inhabilitacion es obligatorio.
   */
  actualizarEstado: async (
    examenId: number,
    estudianteId: number,
    estado_habilitado: boolean,
    motivo_inhabilitacion?: string
  ): Promise<{
    estudiante_id: number;
    examen_id: number;
    estado_habilitado: boolean;
    motivo_inhabilitacion: string | null;
  }> => {
    const { data } = await apiClient.patch(
      `/examenes/${examenId}/estudiantes/${estudianteId}/estado`,
      {
        estado_habilitado,
        motivo_inhabilitacion: estado_habilitado ? undefined : motivo_inhabilitacion,
      }
    );
    return data;
  },

  /**
   * Task 8: Carga masiva mediante archivo CSV (POST /examenes/:examenId/estudiantes/masivo).
   * Campo 'archivo' en multipart/form-data.
   */
  cargaMasiva: async (
    examenId: number,
    file: File
  ): Promise<CargaMasivaBackendResponse> => {
    const formData = new FormData();
    formData.append("archivo", file);

    const { data } = await apiClient.post<CargaMasivaBackendResponse>(
      `/examenes/${examenId}/estudiantes/masivo`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  },
};
