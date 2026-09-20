import { apiClient } from "@/shared/lib/api-client";
import {
    CreateEstudianteManualInput,
    EstudianteExamen,
    ExamenItem,
} from "../types/estudiante.types";
export interface GetEstudiantesResponse {
    total: number;
    page?: number;
    limit?: number;
    data: EstudianteExamen[];
}
export const estudianteService = {
    /**
     * Obtiene los exámenes disponibles para el docente.
     */
    getExamenes: async (): Promise<ExamenItem[]> => {
        const { data } = await apiClient.get<ExamenItem[]>("/examenes");
        return data;
    },
    /**
     * Obtiene la lista de estudiantes de un examen específico.
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
     * Registra manualmente a un estudiante en el examen específico.
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
     * Cambia el estado de un estudiante en el examen a Inhabilitado con motivo opcional.
     */
    inhabilitar: async (
        examenId: number,
        estudianteId: number,
        motivo?: string
    ): Promise<void> => {
        await apiClient.patch(`/habilitaciones/${examenId}/${estudianteId}`, {
            estado_habilitado: false,
            motivo_inhabilitacion: motivo || null,
        });
    },
    /**
     * Reestablece el estado de un estudiante en el examen a Habilitado.
     */
    habilitar: async (
        examenId: number,
        estudianteId: number
    ): Promise<void> => {
        await apiClient.patch(`/habilitaciones/${examenId}/${estudianteId}`, {
            estado_habilitado: true,
            motivo_inhabilitacion: null,
        });
    },
    /**
     * Sube un archivo de estudiantes para el examen.
     */
    subirArchivo: async (
        examenId: number,
        file: File
    ): Promise<unknown> => {
        const formData = new FormData();
        formData.append("archivo", file);
        formData.append("examenId", examenId.toString());
        const { data } = await apiClient.post("/cargas-estudiantes", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
    },
};
