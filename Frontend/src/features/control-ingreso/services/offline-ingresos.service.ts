import { apiClient } from "../../../shared/lib/api-client";
import { openSulluDB, SULLU_STORES } from "../../../shared/lib/offline-sullu-db";
import type {
  IngresoOfflineItem,
  EstudianteQrResultado,
} from "../types/control-ingreso.types";

const OFFLINE_STORAGE_KEY = "sullu_offline_ingresos_queue";
const STORE_NAME = SULLU_STORES.INGRESOS_COLA;

let estaSincronizando = false;

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

    let resolvedCodSis = estudianteInfo?.codSis;
    if (!resolvedCodSis && tokenOrIdentificador.split(".").length === 3) {
      try {
        const base64Url = tokenOrIdentificador.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const parsed = JSON.parse(jsonStr) as { sub?: number; estudianteId?: number };
        if (parsed.sub) resolvedCodSis = String(parsed.sub);
      } catch {
        // Ignorar
      }
    }

    const item: IngresoOfflineItem = {
      id: syncId,
      clienteSyncId: syncId,
      examenId,
      identificador: tokenOrIdentificador,
      tokenQr: tokenOrIdentificador,
      estudianteId: estudianteInfo?.id,
      metodo,
      fechaHora: isoFecha,
      fechaHoraCaptura: isoFecha,
      codSis: resolvedCodSis,
      nombreReferencial: estudianteInfo?.nombre
        ? `${estudianteInfo.nombre} ${estudianteInfo.apellido ?? ""}`.trim()
        : (resolvedCodSis ? `Estudiante #${resolvedCodSis}` : undefined),
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
      const db = await openSulluDB();
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
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem(OFFLINE_STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data) as IngresoOfflineItem[];
      } catch {
        return [];
      }
    }
    return [];
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
    if (estaSincronizando) {
      return {
        totalRecibidos: 0,
        totalSincronizados: 0,
        totalOmitidos: 0,
        totalRechazados: 0,
      };
    }

    const pendientes = await this.obtenerPendientes(examenId);
    if (pendientes.length === 0) {
      return {
        totalRecibidos: 0,
        totalSincronizados: 0,
        totalOmitidos: 0,
        totalRechazados: 0,
      };
    }

    estaSincronizando = true;

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

      // Eliminar de IndexedDB y localStorage TODOS los que ya procesó el servidor
      // (sincronizados, omitidos por duplicado y rechazados por inhabilitados/etc.)
      const syncIdsProcesados = [
        ...(data.sincronizados || []).map((s: { clienteSyncId: string }) => s.clienteSyncId),
        ...(data.omitidos || []).map((s: { clienteSyncId: string }) => s.clienteSyncId),
        ...(data.rechazados || []).map((s: { clienteSyncId: string }) => s.clienteSyncId),
      ];

      // Si por alguna razón el servidor procesó el lote pero no listó IDs específicos, limpiar los enviados
      const idsALimpiar = syncIdsProcesados.length > 0
        ? syncIdsProcesados
        : pendientes.map((p) => p.clienteSyncId);

      await this.limpiarSincronizados(idsALimpiar);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sullu_offline_updated"));
        window.dispatchEvent(new CustomEvent("sullu_incidencias_offline_updated"));
      }

      return {
        totalRecibidos: data.totalRecibidos || pendientes.length,
        totalSincronizados: data.totalSincronizados || (data.sincronizados || []).length,
        totalOmitidos: data.totalOmitidos || 0,
        totalRechazados: data.totalRechazados || (data.rechazados || []).length,
      };
    } catch (err) {
      throw err;
    } finally {
      estaSincronizando = false;
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
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(restantes));
      }
    } catch {
      // Ignorar
    }
  },
};

// Auto-sincronización:
// 1. Cuando el navegador dispara el evento 'online'
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineIngresosService.sincronizarLote().catch(() => {});
  });

  // 2. Auto-verificación cada 6 segundos si hay conexión activa y registros pendientes
  setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      if (offlineIngresosService.contarPendientesSync() > 0) {
        offlineIngresosService.sincronizarLote().catch(() => {});
      }
    }
  }, 6000);
}
