import { apiClient } from "@/shared/lib/api-client";
import type { MiGrupoControlador } from "../types/control-ingreso.types";

const MI_GRUPO_CACHE_PREFIX = "sullu_mi_grupo_examen_";

export function obtenerMiGrupoCache(examenId: number): MiGrupoControlador | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${MI_GRUPO_CACHE_PREFIX}${examenId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function guardarMiGrupoEnCache(
  examenId: number,
  data: MiGrupoControlador
): void {
  if (typeof window === "undefined" || !data) return;
  try {
    localStorage.setItem(
      `${MI_GRUPO_CACHE_PREFIX}${examenId}`,
      JSON.stringify(data)
    );
  } catch {
    // Ignorar errores de almacenamiento local
  }
}

/**
 * HU17: Obtiene el grupo asignado al controlador para un examen específico.
 * En modo online obtiene los datos frescos y los guarda en caché offline.
 * Si no hay conexión (offline), recupera automáticamente la partición asignada desde caché.
 * Devuelve null si el usuario no tiene grupo asignado (ej: docente/admin).
 */
export async function getMiGrupoControlador(
  examenId: number
): Promise<MiGrupoControlador | null> {
  // Si estamos explícitamente offline en el navegador, responder directo desde caché
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return obtenerMiGrupoCache(examenId);
  }

  try {
    const response = await apiClient.get<MiGrupoControlador>(
      `/control-ingreso/examenes/${examenId}/mi-grupo`
    );
    if (response.data) {
      guardarMiGrupoEnCache(examenId, response.data);
    }
    return response.data ?? null;
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { status?: number };
      code?: string;
    };

    // 403 = usuario sin grupo asignado (docente/admin), no es un error real
    if (
      axiosErr?.response?.status === 403 ||
      axiosErr?.response?.status === 404
    ) {
      return null;
    }

    // Si falló por red (offline), intentar recuperar de caché
    if (!axiosErr?.response || axiosErr.code === "ERR_NETWORK") {
      const cached = obtenerMiGrupoCache(examenId);
      if (cached) {
        return cached;
      }
    }

    // Fallback defensivo a caché antes de relanzar
    const fallback = obtenerMiGrupoCache(examenId);
    if (fallback) return fallback;

    throw err;
  }
}
