import { apiClient } from "../../../shared/lib/api-client";
import type {
  IngresoOfflineItem,
  EstudianteQrResultado,
} from "../types/control-ingreso.types";

const OFFLINE_STORAGE_KEY = "sullu_offline_ingresos_queue";
const DB_NAME = "sullu_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "ingresos_cola";

/**
 * Abre o inicializa la base de datos IndexedDB local
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no disponible en este entorno"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "clienteSyncId",
        });
        store.createIndex("examenId", "examenId", { unique: false });
        store.createIndex("sincronizado", "sincronizado", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineIngresosService = {
  /**
   * Guarda un ingreso localmente en IndexedDB (con espejo en localStorage)
   * cuando no hay conectividad o el servidor no responde.
   */
  async guardarIngresoOffline(
    examenId: number,
    tokenOrIdentificador: string,
    estudianteInfo?: Partial<EstudianteQrResultado>,
    metodo: "QR" | "MANUAL" = "QR"
  ): Promise<number> {
    const syncId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const isoFecha = new Date().toISOString();

    const item: IngresoOfflineItem = {
      id: syncId,
      clienteSyncId: syncId,
      examenId,
      identificador: tokenOrIdentificador,
      tokenQr: tokenOrIdentificador,
      metodo,
      fechaHora: isoFecha,
      fechaHoraCaptura: isoFecha,
      codSis: estudianteInfo?.codSis,
      nombreReferencial: estudianteInfo?.nombre
        ? `${estudianteInfo.nombre} ${estudianteInfo.apellido ?? ""}`.trim()
        : undefined,
      sincronizado: false,
    };

    // 1. Guardar en IndexedDB
    try {
      const db = await openIndexedDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Si falla IndexedDB, el fallback de localStorage lo respalda
    }

    // 2. Espejo en localStorage para lectura síncrona inmediata en UI
    try {
      if (typeof window !== "undefined") {
        const existentes = this.obtenerTodosSync();
        existentes.push(item);
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(existentes));
        window.dispatchEvent(new CustomEvent("sullu_offline_updated"));
      }
    } catch {
      // Ignorar errores de cuota local
    }

    return this.contarPendientesSync(examenId);
  },

  /**
   * Obtiene todos los ingresos pendientes desde IndexedDB
   */
  async obtenerPendientes(examenId?: number): Promise<IngresoOfflineItem[]> {
    try {
      const db = await openIndexedDB();
      return new Promise<IngresoOfflineItem[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const items: IngresoOfflineItem[] = req.result || [];
          const noSincronizados = items.filter((i) => !i.sincronizado);
          if (examenId !== undefined) {
            resolve(noSincronizados.filter((i) => i.examenId === examenId));
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
   * Cuenta cuántos ingresos pendientes de sincronización existen (síncrono para badges)
   */
  contarPendientesSync(examenId?: number): number {
    const todos = this.obtenerTodosSync();
    if (examenId === undefined) {
      return todos.filter((i) => !i.sincronizado).length;
    }
    return todos.filter((i) => i.examenId === examenId && !i.sincronizado).length;
  },

  /**
   * Obtiene los pendientes de forma síncrona desde el espejo de localStorage
   */
  obtenerPendientesSync(examenId?: number): IngresoOfflineItem[] {
    const todos = this.obtenerTodosSync();
    if (examenId === undefined) {
      return todos.filter((i) => !i.sincronizado);
    }
    return todos.filter((i) => i.examenId === examenId && !i.sincronizado);
  },

  /**
   * Obtiene todos los items del espejo de localStorage
   */
  obtenerTodosSync(): IngresoOfflineItem[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as IngresoOfflineItem[];
    } catch {
      return [];
    }
  },

  /**
   * Sincroniza en lote con el endpoint del Backend:
   * POST /ingresos/sincronizar
   */
  async sincronizarLote(
    examenId?: number
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
      ingresos: pendientes.map((p) => ({
        clienteSyncId: p.clienteSyncId,
        examenId: p.examenId,
        identificador: p.identificador,
        metodo: p.metodo,
        fechaHora: p.fechaHora,
      })),
    };

    try {
      const response = await apiClient.post("/ingresos/sincronizar", payload);
      const data = response.data;

      // Eliminar de IndexedDB y localStorage los que se procesaron con éxito
      const syncIdsExitosos = (data.sincronizados || []).map(
        (s: { clienteSyncId: string }) => s.clienteSyncId
      );

      await this.limpiarSincronizados(syncIdsExitosos);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sullu_offline_updated"));
      }

      return {
        totalRecibidos: data.totalRecibidos || pendientes.length,
        totalSincronizados: data.totalSincronizados || syncIdsExitosos.length,
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
      const db = await openIndexedDB();
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
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(restantes));
      }
    } catch {
      // Ignorar
    }
  },
};

// Escuchar evento 'online' del navegador para auto-sincronizar
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineIngresosService.sincronizarLote().catch(() => {});
  });
}
