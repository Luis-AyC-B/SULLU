import { apiClient } from "@/shared/lib/api-client";
import type { MiGrupoControlador } from "../types/control-ingreso.types";

/**
 * HU17: Obtiene el grupo asignado al controlador para un examen específico.
 * Devuelve null si el usuario no tiene grupo asignado (ej: docente/admin).
 */
export async function getMiGrupoControlador(
  examenId: number
): Promise<MiGrupoControlador | null> {
  try {
    const response = await apiClient.get<MiGrupoControlador>(
      `/control-ingreso/examenes/${examenId}/mi-grupo`
    );
    return response.data ?? null;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    // 403 = usuario sin grupo asignado (docente/admin), no es un error real
    if (
      axiosErr?.response?.status === 403 ||
      axiosErr?.response?.status === 404
    ) {
      return null;
    }
    throw err;
  }
}
