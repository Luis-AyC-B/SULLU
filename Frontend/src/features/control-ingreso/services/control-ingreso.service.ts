import { apiClient } from "../../../shared/lib/api-client";
import {
  idbGetAll,
  idbPut,
  SULLU_STORES,
} from "../../../shared/lib/offline-sullu-db";
import type {
  ExamenAsignado,
  ResumenEnVivoData,
  EstudianteBusquedaItem,
  RegistroManualPayload,
  RegistroManualResponse,
  ValidacionQrResponse,
} from "../types/control-ingreso.types";
import { offlineIngresosService } from "./offline-ingresos.service";
import { offlineIncidenciasService } from "../../ingresos-rechazados/services/offline-incidencias.service";

const EXAMENES_STORAGE_KEY = "sullu_examenes_asignados_cache";
const RESUMEN_STORAGE_PREFIX = "sullu_resumen_examen_";
const INGRESADOS_CACHE_PREFIX = "sullu_estudiantes_ingresados_";
const NOMINA_CACHE_PREFIX = "sullu_nomina_estudiantes_";

interface IngresadoCacheItem {
  estudianteId?: number;
  codSis: string;
  nombre: string;
  hora: string;
  token?: string;
}

export interface EstudianteNominaCache {
  id: number;
  codSis: string;
  ci?: string;
  nombre: string;
  apellido?: string;
  estadoHabilitado: boolean;
  motivoInhabilitacion?: string | null;
  ambienteAsignado?: string;
  yaIngreso: boolean;
  horaIngresoPrevio?: string;
  metodoIngresoPrevio?: "QR" | "MANUAL";
}

function obtenerIngresadosCache(examenId: number): IngresadoCacheItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${INGRESADOS_CACHE_PREFIX}${examenId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function registrarIngresadoEnCache(
  examenId: number,
  item: IngresadoCacheItem
): void {
  if (typeof window === "undefined") return;
  try {
    const list = obtenerIngresadosCache(examenId);
    const existe = list.some(
      (i) =>
        (item.estudianteId && i.estudianteId === item.estudianteId) ||
        (item.codSis && i.codSis === item.codSis) ||
        (item.token && i.token === item.token)
    );
    if (!existe) {
      list.push(item);
      localStorage.setItem(
        `${INGRESADOS_CACHE_PREFIX}${examenId}`,
        JSON.stringify(list)
      );
    }
  } catch {
    // Ignorar
  }
}

function guardarNominaEnCache(
  examenId: number,
  estudiantes: EstudianteNominaCache[]
): void {
  if (typeof window === "undefined" || !Array.isArray(estudiantes)) return;
  try {
    localStorage.setItem(
      `${NOMINA_CACHE_PREFIX}${examenId}`,
      JSON.stringify(estudiantes)
    );
    localStorage.setItem(`sullu_nomina_timestamp_${examenId}`, String(Date.now()));
    // Registrar también automáticamente a quienes ya ingresaron en el servidor
    for (const e of estudiantes) {
      if (e.yaIngreso) {
        registrarIngresadoEnCache(examenId, {
          estudianteId: e.id,
          codSis: e.codSis,
          nombre: `${e.nombre} ${e.apellido || ""}`.trim(),
          hora: e.horaIngresoPrevio || "Previa marcación",
        });
      }
    }
  } catch {
    // Ignorar
  }
}


export function obtenerTimestampNominaCache(examenId: number): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`sullu_nomina_timestamp_${examenId}`);
  return raw ? Number(raw) : null;
}

export function obtenerNominaCache(examenId: number): EstudianteNominaCache[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${NOMINA_CACHE_PREFIX}${examenId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function buscarEstudianteEnNomina(
  examenId: number,
  identificador?: number | string
): EstudianteNominaCache | null {
  if (
    identificador === undefined ||
    identificador === null ||
    typeof window === "undefined"
  )
    return null;
  try {
    const nomina = obtenerNominaCache(examenId);
    const idStr = String(identificador).trim().toLowerCase();
    return (
      nomina.find(
        (e) =>
          String(e.id).toLowerCase() === idStr ||
          e.codSis.toLowerCase() === idStr ||
          (e.ci && e.ci.toLowerCase() === idStr)
      ) || null
    );
  } catch {
    return null;
  }
}

export const controlIngresoService = {
  /**
   * Obtiene la lista de exámenes asignados al usuario de control actual.
   * Con fallback a IndexedDB y localStorage si no hay conexión.
   */
  async getMisExamenes(): Promise<ExamenAsignado[]> {
    try {
      const response = await apiClient.get<ExamenAsignado[]>(
        "/control-ingreso/mis-examenes"
      );
      const lista = Array.isArray(response.data) ? response.data : [];

      if (typeof window !== "undefined" && lista.length > 0) {
        try {
          localStorage.setItem(EXAMENES_STORAGE_KEY, JSON.stringify(lista));
          for (const item of lista) {
            await idbPut(SULLU_STORES.EXAMENES_ASIGNADOS, item);
          }
        } catch {
          // Ignorar errores de guardado de cache
        }
      }

      return lista;
    } catch (err: unknown) {
      try {
        const cachedIdb = await idbGetAll<ExamenAsignado>(
          SULLU_STORES.EXAMENES_ASIGNADOS
        );
        if (cachedIdb && cachedIdb.length > 0) {
          return cachedIdb;
        }
      } catch {
        // Continuar a localStorage
      }

      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(EXAMENES_STORAGE_KEY);
        if (raw) {
          try {
            return JSON.parse(raw) as ExamenAsignado[];
          } catch {
            // Ignorar
          }
        }
      }

      throw err;
    }
  },

  /**
   * Obtiene el resumen en vivo y los últimos ingresos de un examen activo.
   * Si no hay red, entrega el último snapshot guardado en cache.
   */
  async getResumenExamen(examenId: number): Promise<ResumenEnVivoData> {
    try {
      const response = await apiClient.get<ResumenEnVivoData>(
        `/control-ingreso/examenes/${examenId}/resumen`
      );
      if (response.data && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `${RESUMEN_STORAGE_PREFIX}${examenId}`,
            JSON.stringify(response.data)
          );

          // Actualizar lista de ingresados conocidos en el servidor
          if (Array.isArray(response.data.ultimosIngresos)) {
            for (const ing of response.data.ultimosIngresos) {
              registrarIngresadoEnCache(examenId, {
                estudianteId: ing.id,
                codSis: ing.codSis,
                nombre: ing.nombre,
                hora: ing.hora,
              });
            }
          }

          // Pre-cargar y mantener actualizada la nómina completa del examen para modo offline
          this.cargarNominaCompletaExamen(examenId).catch(() => {});
        } catch {
          // Ignorar
        }
      }
      return response.data;
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        throw err;
      }
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(
          `${RESUMEN_STORAGE_PREFIX}${examenId}`
        );
        if (cached) {
          try {
            return JSON.parse(cached) as ResumenEnVivoData;
          } catch {
            // Ignorar
          }
        }
      }
      throw err;
    }
  },

  /**
   * Carga la nómina completa del examen desde el backend y la persiste en caché
   * (con estados de habilitación, motivo de inhabilitación e ingresos previos) para uso offline.
   */
  async cargarNominaCompletaExamen(
    examenId: number
  ): Promise<EstudianteNominaCache[]> {
    try {
      const response = await apiClient.get<EstudianteBusquedaItem[]>(
        `/ingresos/examen/${examenId}/estudiantes`,
        { timeout: 4000 }
      );
      if (Array.isArray(response.data) && response.data.length > 0) {
        const items: EstudianteNominaCache[] = response.data.map((e) => ({
          id: e.id,
          codSis: e.codSis,
          ci: e.ci,
          nombre: e.nombre,
          apellido: e.apellido,
          estadoHabilitado: e.estadoHabilitado,
          motivoInhabilitacion: e.motivoInhabilitacion,
          ambienteAsignado: e.ambienteAsignado,
          yaIngreso: e.yaIngreso,
          horaIngresoPrevio: e.horaIngresoPrevio,
          metodoIngresoPrevio: e.metodoIngresoPrevio,
        }));
        guardarNominaEnCache(examenId, items);
        return items;
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        throw err;
      }
      // Ignorar error de red y retornar caché local
    }
    return obtenerNominaCache(examenId);
  },

  /**
   * HU8: Busca estudiantes por código SIS, carnet (CI) o nombre para el examen activo.
   */
  async buscarEstudiantes(
    examenId: number,
    query: string
  ): Promise<EstudianteBusquedaItem[]> {
    const term = query.trim().toLowerCase();

    // Si no hay término, devolver nómina completa cargada o desde caché
    if (!term) {
      const nomina = await this.cargarNominaCompletaExamen(examenId);
      return nomina.map((e) => ({
        ...e,
        ci: e.ci || "",
        apellido: e.apellido || "",
        ambienteAsignado: e.ambienteAsignado || "",
        yaIngreso: !!e.yaIngreso,
      }));
    }

    // 1. Intentar endpoint dedicado de control de ingreso: /ingresos/examen/:examenId/estudiantes
    try {
      const response = await apiClient.get<EstudianteBusquedaItem[]>(
        `/ingresos/examen/${examenId}/estudiantes?q=${encodeURIComponent(term)}`
      );
      if (Array.isArray(response.data)) {
        guardarNominaEnCache(
          examenId,
          response.data.map((e) => ({
            id: e.id,
            codSis: e.codSis,
            ci: e.ci,
            nombre: e.nombre,
            apellido: e.apellido,
            estadoHabilitado: e.estadoHabilitado,
            motivoInhabilitacion: e.motivoInhabilitacion,
            ambienteAsignado: e.ambienteAsignado,
            yaIngreso: e.yaIngreso,
            horaIngresoPrevio: e.horaIngresoPrevio,
            metodoIngresoPrevio: e.metodoIngresoPrevio,
          }))
        );
        return response.data;
      }
    } catch {
      // Continuar con fallback
    }

    // 2. Fallback local: Buscar en la nómina en caché
    const nominaLocal = obtenerNominaCache(examenId);
    if (nominaLocal.length > 0) {
      return nominaLocal
        .filter(
          (e) =>
            e.codSis.toLowerCase().includes(term) ||
            e.nombre.toLowerCase().includes(term) ||
            (e.apellido && e.apellido.toLowerCase().includes(term)) ||
            (e.ci && e.ci.toLowerCase().includes(term))
        )
        .map((e) => ({
          ...e,
          ci: e.ci || "",
          apellido: e.apellido || "",
          ambienteAsignado: e.ambienteAsignado || "",
          yaIngreso: !!e.yaIngreso,
        }));
    }

    return [];

    return [];
  },

  /**
   * HU8: Registra el ingreso manual de un estudiante validado en el examen activo.
   */
  async registrarIngresoManual(
    examenId: number,
    payload: RegistroManualPayload
  ): Promise<RegistroManualResponse> {
    const syncId =
      payload.clienteSyncId ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `manual_${Date.now()}`);

    // Si el navegador no tiene conexión activa, guardar directo en cola offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineIngresosService.guardarIngresoOffline(
        examenId,
        payload.identificador,
        undefined,
        "MANUAL"
      );
      return {
        success: true,
        ingresoId: -1,
        fechaHora: new Date().toISOString(),
        estudiante: {
          id: payload.estudianteId || 0,
          codSis: payload.identificador,
          ci: "",
          nombre: "Estudiante",
          apellido: "",
          estadoHabilitado: true,
          ambienteAsignado: "",
          yaIngreso: true,
        },
        mensaje: "Ingreso manual guardado sin conexión",
      };
    }

    try {
      const response = await apiClient.post<{
        mensaje: string;
        fueraDeGrupo?: boolean;
        advertencia?: string;
        grupoCorrecto?: {
          colaboradorId: number;
          nombreControlador: string;
          rango: string;
        };
        ingreso: {
          id: number;
          estudianteId: number;
          examenId: number;
          fechaHora: string;
          metodo: string;
          esOffline: boolean;
          estudiante: {
            id: number;
            cod_sis: string;
            nombre: string;
            apellido: string;
            ci?: string;
          };
          examen?: {
            id: number;
            tipoExamen?: string;
          };
        };
      }>("/ingresos/manual", {
        examenId,
        identificador: payload.identificador,
        clienteSyncId: syncId,
      });

      if (response.data && response.data.ingreso) {
        const ing = response.data.ingreso;
        const nombreCompleto = `${ing.estudiante.nombre} ${ing.estudiante.apellido || ""}`.trim();
        registrarIngresadoEnCache(examenId, {
          estudianteId: ing.estudiante.id,
          codSis: ing.estudiante.cod_sis,
          nombre: nombreCompleto,
          hora: new Date(ing.fechaHora).toLocaleTimeString("es-BO"),
        });

        return {
          success: true,
          ingresoId: ing.id,
          fechaHora: ing.fechaHora,
          estudiante: {
            id: ing.estudiante.id,
            codSis: ing.estudiante.cod_sis,
            ci: ing.estudiante.ci || "",
            nombre: ing.estudiante.nombre,
            apellido: ing.estudiante.apellido,
            estadoHabilitado: true,
            ambienteAsignado: "",
            yaIngreso: true,
          },
          mensaje: response.data.mensaje || "Ingreso registrado exitosamente",
          fueraDeGrupo: response.data.fueraDeGrupo ?? false,
          advertencia: response.data.advertencia,
        };
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status: number; data?: { message?: string } };
        code?: string;
      };

      if (!axiosErr.response || axiosErr.code === "ERR_NETWORK") {
        const estNomina = buscarEstudianteEnNomina(examenId, payload.identificador);
        if (estNomina) {
          if (!estNomina.estadoHabilitado) {
            const motivo =
              estNomina.motivoInhabilitacion || "Inhabilitado para este examen";
            offlineIncidenciasService
              .guardarIncidenciaOffline(
                {
                  examenId: String(examenId),
                  codigoSis: estNomina.codSis,
                  motivo: "NO_HABILITADO",
                  observaciones: motivo,
                },
                `${estNomina.nombre} ${estNomina.apellido || ""}`.trim()
              )
              .catch(() => {});
            throw new Error(`Estudiante no habilitado: ${motivo}`);
          }

          // Verificar doble marcación
          const ingresados = obtenerIngresadosCache(examenId);
          const yaEnCache = ingresados.find(
            (i) =>
              i.estudianteId === estNomina.id || i.codSis === estNomina.codSis
          );
          if (estNomina.yaIngreso || yaEnCache) {
            const horaPrev =
              estNomina.horaIngresoPrevio ||
              yaEnCache?.hora ||
              "Previa marcación";
            offlineIncidenciasService
              .guardarIncidenciaOffline(
                {
                  examenId: String(examenId),
                  codigoSis: estNomina.codSis,
                  motivo: "DOBLE_MARCACION",
                  observaciones: `Intento de ingreso manual duplicado. Marcación previa: ${horaPrev}`,
                },
                `${estNomina.nombre} ${estNomina.apellido || ""}`.trim()
              )
              .catch(() => {});
            throw new Error(`El estudiante ya registró su ingreso a este examen`);
          }
        }

        const nombreReal = estNomina
          ? `${estNomina.nombre} ${estNomina.apellido || ""}`.trim()
          : "Estudiante";
        const codSisReal = estNomina ? estNomina.codSis : payload.identificador;

        await offlineIngresosService.guardarIngresoOffline(
          examenId,
          payload.identificador,
          {
            id: estNomina?.id || payload.estudianteId,
            nombre: nombreReal,
            codSis: codSisReal,
          },
          "MANUAL"
        );

        if (estNomina) {
          estNomina.yaIngreso = true;
          estNomina.horaIngresoPrevio = new Date().toLocaleTimeString("es-BO");
          const nomina = obtenerNominaCache(examenId);
          const idx = nomina.findIndex((e) => e.id === estNomina.id);
          if (idx !== -1) {
            nomina[idx] = { ...estNomina };
            guardarNominaEnCache(examenId, nomina);
          }
        }

        return {
          success: true,
          ingresoId: -1,
          fechaHora: new Date().toISOString(),
          estudiante: {
            id: estNomina?.id || payload.estudianteId || 0,
            codSis: codSisReal,
            ci: estNomina?.ci || "",
            nombre: nombreReal,
            apellido: "",
            estadoHabilitado: true,
            ambienteAsignado: "",
            yaIngreso: true,
          },
          mensaje:
            "Ingreso guardado sin conexión (se sincronizará al reconectar)",
        };
      }

      if (axiosErr.response?.data?.message) {
        throw new Error(axiosErr.response.data.message);
      }
      throw err;
    }

    throw new Error("No se pudo registrar el ingreso manual.");
  },

  /**
   * HU8 & HU9: Validación de QR y registro de ingreso.
   * Valida la habilitación contra la nómina oficial precargada y previene dobles marcaciones.
   */
  async validarYRegistrarQr(examenId: number, tokenQr: string): Promise<ValidacionQrResponse> {
    try {
      const response = await apiClient.post<ValidacionQrResponse>('/ingresos/qr', { examenId, token: tokenQr });
      const { data } = response;
      if (data.estudiante?.fotoUrl?.startsWith('/')) {
        const base = response.config.baseURL || '';
        data.estudiante.fotoUrl = `${base}${data.estudiante.fotoUrl}`;
      }
      return data;
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      const mensaje = err.response?.data?.message || 'No se pudo validar el QR. Se requiere conexi?n.';
      return { success: false, mensaje, excepcion: err.response?.status === 409 ? 'YA_REGISTRADO' : /expirado|caducado|revocado/i.test(mensaje) ? 'QR_CADUCADO' : /no habilitado/i.test(mensaje) ? 'NO_HABILITADO' : 'QR_INVALIDO' };
    }
  },
};
