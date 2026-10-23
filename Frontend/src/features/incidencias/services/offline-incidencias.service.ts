import { apiClient } from "@/shared/lib/api-client";
import { openSulluDB, SULLU_STORES } from "@/shared/lib/offline-sullu-db";
import type {
  CrearIncidenciaPayload,
  Incidencia,
  MotivoIncidencia,
} from "../types/incidencias.types";

const OFFLINE_INCIDENCIAS_STORAGE_KEY = "sullu_offline_incidencias_queue";
const STORE_NAME = SULLU_STORES.INCIDENCIAS_COLA;

export interface IncidenciaOfflineItem {
  id: string;
  clienteSyncId: string;
  examenId: string;
  codigoSis: string;
  motivo: MotivoIncidencia;
  observaciones?: string;
  fechaHoraCaptura: string;
  estudianteNombre?: string;
  sincronizado: boolean;
}

export const offlineIncidenciasService = {
  /**
   * Guarda una incidencia en IndexedDB (con espejo en localStorage)
   * cuando no hay conexión.
   */
  async guardarIncidenciaOffline(
    payload: CrearIncidenciaPayload,
    estudianteNombre = "Estudiante (offline)",
  ): Promise<Incidencia> {
    const syncId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `inc_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const isoFecha = new Date().toISOString();

    const item: IncidenciaOfflineItem = {
      id: syncId,
      clienteSyncId: syncId,
      examenId: payload.examenId,
      codigoSis: payload.codigoSis,
      motivo: payload.motivo,
      observaciones: payload.observaciones,
      fechaHoraCaptura: isoFecha,
      estudianteNombre,
      sincronizado: false,
    };

    // 1. Guardar en IndexedDB
    try {
      const db = await openSulluDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignorar error de IDB, fallback a localStorage
    }

    // 2. Espejo en localStorage
    try {
      if (typeof window !== "undefined") {
        const existentes = this.obtenerTodosSync();
        existentes.push(item);
        localStorage.setItem(
          OFFLINE_INCIDENCIAS_STORAGE_KEY,
          JSON.stringify(existentes)
        );
        window.dispatchEvent(
          new CustomEvent("sullu_incidencias_offline_updated")
        );
      }
    } catch {
      // Ignorar
    }

    // Retorna formato Incidencia para actualización inmediata en UI
    return {
      id: syncId,
      examenId: payload.examenId,
      fechaHora: isoFecha,
      codigoSis: payload.codigoSis,
      estudianteNombre,
      motivo: payload.motivo,
      observaciones: payload.observaciones ?? null,
      registradoPor: "Control (offline)",
    };
  },

  /**
   * Obtiene todas las incidencias pendientes de sincronizar
   */
  async obtenerPendientes(examenId?: string): Promise<IncidenciaOfflineItem[]> {
    try {
      const db = await openSulluDB();
      return new Promise<IncidenciaOfflineItem[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const items: IncidenciaOfflineItem[] = req.result || [];
          const noSincronizados = items.filter((i) => !i.sincronizado);
          if (examenId !== undefined) {
            resolve(noSincronizados.filter((i) => i.examenId === String(examenId)));
          } else {
            resolve(noSincronizados);
          }
        };

        req.onerror = () => {
          resolve(this.obtenerPendientesSync(examenId));
        };
      });
    } catch {
      return this.obtenerPendientesSync(examenId);
    }
  },

  /**
   * Obtiene las incidencias pendientes de forma síncrona desde localStorage
   */
  obtenerPendientesSync(examenId?: string): IncidenciaOfflineItem[] {
    const todos = this.obtenerTodosSync();
    if (examenId === undefined) {
      return todos.filter((i) => !i.sincronizado);
    }
    return todos.filter(
      (i) => i.examenId === String(examenId) && !i.sincronizado
    );
  },

  /**
   * Cuenta las incidencias pendientes de sincronización
   */
  contarPendientesSync(examenId?: string): number {
    return this.obtenerPendientesSync(examenId).length;
  },

  /**
   * Lee todos los registros del espejo de localStorage
   */
  obtenerTodosSync(): IncidenciaOfflineItem[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(OFFLINE_INCIDENCIAS_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as IncidenciaOfflineItem[];
    } catch {
      return [];
    }
  },

  /**
   * Sincroniza en lote con el endpoint del Backend:
   * POST /incidencias/sincronizar
   */
  async sincronizarLote(
    examenId?: string
  ): Promise<{
    totalRecibidos: number;
    totalSincronizados: number;
    totalOmitidos: number;
    totalRechazados: number;
  }> {
    const pendientes = await this.obtenerPendientes(examenId);
    if (pendientes.length === 0) {
      return {
        totalRecibidos: 0,
        totalSincronizados: 0,
        totalOmitidos: 0,
        totalRechazados: 0,
      };
    }

    const payload = {
      incidencias: pendientes.map((p) => ({
        clienteSyncId: p.clienteSyncId,
        examenId: p.examenId,
        codigoSis: p.codigoSis,
        motivo: p.motivo,
        observaciones: p.observaciones,
        fechaHoraCaptura: p.fechaHoraCaptura,
      })),
    };

    try {
      const response = await apiClient.post("/incidencias/sincronizar", payload);
      const data = response.data;

      const syncIdsProcesados = [
        ...(data.sincronizados || []).map((s: { clienteSyncId: string }) => s.clienteSyncId),
        ...(data.omitidos || []).map((s: { clienteSyncId: string }) => s.clienteSyncId),
      ];

      await this.limpiarSincronizados(syncIdsProcesados);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sullu_incidencias_offline_updated")
        );
      }

      return {
        totalRecibidos: data.totalRecibidos || pendientes.length,
        totalSincronizados: data.totalSincronizados || (data.sincronizados || []).length,
        totalOmitidos: data.totalOmitidos || 0,
        totalRechazados: data.totalRechazados || 0,
      };
    } catch (err) {
      throw err;
    }
  },

  /**
   * Elimina de IndexedDB y del espejo los registros sincronizados
   */
  async limpiarSincronizados(syncIds: string[]): Promise<void> {
    if (!syncIds || syncIds.length === 0) return;
    const idSet = new Set(syncIds);

    // 1. Limpiar de IndexedDB
    try {
      const db = await openSulluDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const id of syncIds) {
        store.delete(id);
      }
    } catch {
      // Ignorar
    }

    // 2. Limpiar del espejo de localStorage
    try {
      if (typeof window !== "undefined") {
        const restantes = this.obtenerTodosSync().filter(
          (i) => !idSet.has(i.clienteSyncId)
        );
        localStorage.setItem(
          OFFLINE_INCIDENCIAS_STORAGE_KEY,
          JSON.stringify(restantes)
        );
      }
    } catch {
      // Ignorar
    }
  },
};

// Escuchar evento online para auto-sincronizar incidencias pendientes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineIncidenciasService.sincronizarLote().catch(() => {});
  });
}
