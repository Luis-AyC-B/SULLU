import type { IngresoOfflineItem, EstudianteQrResultado } from "../types/control-ingreso.types";

const OFFLINE_STORAGE_KEY = "exacontrol_offline_ingresos_queue";

export const offlineIngresosService = {
  /**
   * Guarda un ingreso localmente cuando no hay conectividad a Internet.
   * Retorna la cantidad total de ingresos pendientes de sincronización.
   */
  async guardarIngresoOffline(
    examenId: number,
    tokenQr: string,
    estudianteInfo?: Partial<EstudianteQrResultado>
  ): Promise<number> {
    const item: IngresoOfflineItem = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      examenId,
      tokenQr,
      codSis: estudianteInfo?.codSis,
      nombreReferencial: estudianteInfo?.nombre
        ? `${estudianteInfo.nombre} ${estudianteInfo.apellido ?? ""}`.trim()
        : undefined,
      fechaHoraCaptura: new Date().toISOString(),
      sincronizado: false,
    };

    const existentes = this.obtenerTodos();
    existentes.push(item);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(existentes));
      }
    } catch {
      // Manejar cuota de localStorage excedida si fuera el caso
    }

    return this.contarPendientes(examenId);
  },

  /**
   * Retorna el número de ingresos pendientes de sincronizar para el examen activo o global.
   */
  contarPendientes(examenId?: number): number {
    const todos = this.obtenerTodos();
    if (examenId === undefined) {
      return todos.filter((i) => !i.sincronizado).length;
    }
    return todos.filter((i) => i.examenId === examenId && !i.sincronizado).length;
  },

  /**
   * Retorna la lista de ingresos pendientes de sincronizar.
   */
  obtenerPendientes(examenId?: number): IngresoOfflineItem[] {
    const todos = this.obtenerTodos();
    if (examenId === undefined) {
      return todos.filter((i) => !i.sincronizado);
    }
    return todos.filter((i) => i.examenId === examenId && !i.sincronizado);
  },

  /**
   * Obtiene todos los items almacenados.
   */
  obtenerTodos(): IngresoOfflineItem[] {
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
   * Marca o elimina los ingresos que ya fueron sincronizados por el backend.
   */
  limpiarSincronizados(idsSincronizados: string[]): void {
    if (typeof window === "undefined") return;
    try {
      const idSet = new Set(idsSincronizados);
      const restantes = this.obtenerTodos().filter((i) => !idSet.has(i.id));
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(restantes));
    } catch {
      // Ignorar
    }
  },
};
