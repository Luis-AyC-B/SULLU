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
  EstudianteQrResultado,
  RegistroManualPayload,
  RegistroManualResponse,
  ValidacionQrResponse,
} from "../types/control-ingreso.types";
import { offlineIngresosService } from "./offline-ingresos.service";
import { offlineIncidenciasService } from "../../ingresos-rechazados/services/offline-incidencias.service";
import {
  obtenerMiGrupoCache,
  getMiGrupoControlador,
} from "../api/mi-grupo.api";

const EXAMENES_STORAGE_KEY = "sullu_examenes_asignados_cache";
const RESUMEN_STORAGE_PREFIX = "sullu_resumen_examen_";
const INGRESADOS_CACHE_PREFIX = "sullu_estudiantes_ingresados_";
const NOMINA_CACHE_PREFIX = "sullu_nomina_estudiantes_";

const fotosPrecargadasSet = new Set<string>();
const ultimaCargaNominaPorExamen: Record<number, number> = {};

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
  fotoUrl?: string | null;
  estadoHabilitado: boolean;
  motivoInhabilitacion?: string | null;
  ambienteAsignado?: string;
  yaIngreso: boolean;
  horaIngresoPrevio?: string;
  metodoIngresoPrevio?: "QR" | "MANUAL";
  nombreLista?: string;
  rangoAsignado?: string;
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

    // Sincronizar la lista de ingresados en caché con el estado real
    const nuevosIngresados: IngresadoCacheItem[] = [];
    for (const e of estudiantes) {
      if (e.yaIngreso) {
        nuevosIngresados.push({
          estudianteId: e.id,
          codSis: e.codSis,
          nombre: `${e.nombre} ${e.apellido || ""}`.trim(),
          hora: e.horaIngresoPrevio || "Previa marcación",
        });
      }
    }

    // Preservar ingresos que estén pendientes en la cola offline local
    try {
      const rawCola = localStorage.getItem("sullu_offline_ingresos_queue");
      if (rawCola) {
        const cola = JSON.parse(rawCola) as Array<{
          examenId: number | string;
          estudianteId?: number;
          codSis?: string;
          nombreReferencial?: string;
          fechaHora: string;
        }>;
        for (const item of cola) {
          if (String(item.examenId) === String(examenId)) {
            const yaEsta = nuevosIngresados.some(
              (i) =>
                (item.codSis && i.codSis === item.codSis) ||
                (item.estudianteId && i.estudianteId === item.estudianteId)
            );
            if (!yaEsta) {
              nuevosIngresados.push({
                estudianteId: item.estudianteId,
                codSis: item.codSis || "",
                nombre: item.nombreReferencial || "Estudiante",
                hora: new Date(item.fechaHora).toLocaleTimeString("es-BO", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "America/La_Paz",
                }),
              });
            }
          }
        }
      }
    } catch {
      // Ignorar
    }

    localStorage.setItem(
      `${INGRESADOS_CACHE_PREFIX}${examenId}`,
      JSON.stringify(nuevosIngresados)
    );
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

interface DecodedTokenInfo {
  cleanToken: string;
  payload: {
    sub?: number;
    estudianteId?: number;
    examenId?: number;
    codSis?: string;
    qrVersion?: number;
    jti?: string;
    tipo?: string;
    exp?: number;
    iat?: number;
  } | null;
  esTokenPrueba: boolean;
  esExpiradoPrueba: boolean;
}

function parsearTokenQr(rawToken: string): DecodedTokenInfo {
  let cleanToken = rawToken.trim();
  const matchUrl = cleanToken.match(/\/qr\/v\/([A-Za-z0-9\-_.]+)/i);
  if (matchUrl) {
    cleanToken = matchUrl[1];
  } else if (cleanToken.includes("token=")) {
    const matchParam = cleanToken.match(/[?&]token=([^&]+)/);
    if (matchParam) cleanToken = decodeURIComponent(matchParam[1]);
  }

  // Tokens de prueba del seed
  if (cleanToken.startsWith("qr_test_")) {
    const esExpiradoPrueba = cleanToken.includes("expirado");
    return {
      cleanToken,
      payload: {
        tipo: "examen",
        sub: 1,
      },
      esTokenPrueba: true,
      esExpiradoPrueba,
    };
  }

  // JWT estándar de 3 segmentos (header.payload.signature)
  const parts = cleanToken.split(".");
  if (parts.length === 3) {
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(jsonStr) as {
        sub?: number;
        estudianteId?: number;
        examenId?: number;
        codSis?: string;
        qrVersion?: number;
        jti?: string;
        tipo?: string;
        exp?: number;
        iat?: number;
      };
      if (parsed && typeof parsed === "object") {
        return {
          cleanToken,
          payload: parsed,
          esTokenPrueba: false,
          esExpiradoPrueba: false,
        };
      }
    } catch {
      // Ignorar errores de parsing
    }
  }

  return {
    cleanToken,
    payload: null,
    esTokenPrueba: false,
    esExpiradoPrueba: false,
  };
}

/**
 * HU17 Offline: Valida si un estudiante pertenece a la lista/fila asignada al controlador
 * utilizando la partición guardada en caché local.
 */
function validarEstudianteEnGrupoOffline(
  examenId: number,
  estudiante: { id: number; codSis: string; nombre?: string; apellido?: string }
): {
  pertenece: boolean;
  mensaje?: string;
  nombreListaCorrecta?: string;
  rangoCorrecto?: string;
} {
  const miGrupo = obtenerMiGrupoCache(examenId);
  // Si no hay miGrupo (docente o admin sin partición) o el examen no está particionado
  if (!miGrupo) return { pertenece: true };

  const tieneParticion =
    miGrupo.totalEstudiantesGrupo < miGrupo.totalEstudiantesExamen;
  if (!tieneParticion) return { pertenece: true };

  const estaEnMiGrupo = miGrupo.estudiantes.some(
    (e) => e.id === estudiante.id || e.codSis === estudiante.codSis
  );

  if (estaEnMiGrupo) {
    return { pertenece: true };
  }

  // Buscar información de la lista de destino en la nómina en caché
  const estNomina = buscarEstudianteEnNomina(
    examenId,
    estudiante.id || estudiante.codSis
  );
  const listaDestino = estNomina?.nombreLista || "otra lista";
  const rangoDestino = estNomina?.rangoAsignado
    ? ` (${estNomina.rangoAsignado})`
    : "";
  const nombreEst =
    `${estudiante.nombre ?? ""} ${estudiante.apellido ?? ""}`.trim() ||
    `Estudiante #${estudiante.codSis}`;

  return {
    pertenece: false,
    mensaje: `${nombreEst} no pertenece a tu fila asignada (${miGrupo.nombreLista || "Tu lista"}: ${miGrupo.rango}). Debe dirigirse al controlador asignado a ${listaDestino}${rangoDestino}.`,
    nombreListaCorrecta: estNomina?.nombreLista,
    rangoCorrecto: estNomina?.rangoAsignado,
  };
}

export const controlIngresoService = {
  obtenerResumenCache(examenId: number): ResumenEnVivoData | null {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(`${RESUMEN_STORAGE_PREFIX}${examenId}`);
      return cached ? (JSON.parse(cached) as ResumenEnVivoData) : null;
    } catch {
      return null;
    }
  },

  /**
   * Obtiene la lista de exámenes asignados al usuario de control actual.
   * Con fallback a IndexedDB y localStorage si no hay conexión.
   */
  async getMisExamenes(): Promise<ExamenAsignado[]> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        const cachedIdb = await idbGetAll<ExamenAsignado>(
          SULLU_STORES.EXAMENES_ASIGNADOS
        );
        if (cachedIdb && cachedIdb.length > 0) {
          return cachedIdb;
        }
      } catch {}
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(EXAMENES_STORAGE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached) as ExamenAsignado[];
          } catch {}
        }
      }
      return [];
    }

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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = this.obtenerResumenCache(examenId);
      if (cached) return cached;
      return {
        examenId,
        asignatura: "",
        ambiente: "",
        horario: "",
        estado: "EN_CURSO",
        totalHabilitados: 0,
        ingresados: 0,
        pendientes: 0,
        incidencias: 0,
        ultimosIngresos: [],
      };
    }

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
   * (con estados de habilitación, lista/rango asignado e ingresos previos) para uso offline.
   */
  async cargarNominaCompletaExamen(
    examenId: number,
    forzar: boolean = false
  ): Promise<EstudianteNominaCache[]> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return obtenerNominaCache(examenId);
    }

    const ahora = Date.now();
    const ultimoFetch = ultimaCargaNominaPorExamen[examenId] || 0;
    // Si ya se cargó hace menos de 60 segundos y tenemos nómina en caché, no repetir petición pesada
    if (!forzar && ahora - ultimoFetch < 60000) {
      const cached = obtenerNominaCache(examenId);
      if (cached.length > 0) return cached;
    }

    try {
      const response = await apiClient.get<EstudianteBusquedaItem[]>(
        `/ingresos/examen/${examenId}/estudiantes`,
        { timeout: 4000 }
      );
      if (Array.isArray(response.data) && response.data.length > 0) {
        ultimaCargaNominaPorExamen[examenId] = ahora;
        const items: EstudianteNominaCache[] = response.data.map((e) => ({
          id: e.id,
          codSis: e.codSis,
          ci: e.ci,
          nombre: e.nombre,
          apellido: e.apellido,
          fotoUrl: e.fotoUrl,
          estadoHabilitado: e.estadoHabilitado,
          motivoInhabilitacion: e.motivoInhabilitacion,
          ambienteAsignado: e.ambienteAsignado,
          yaIngreso: e.yaIngreso,
          horaIngresoPrevio: e.horaIngresoPrevio,
          metodoIngresoPrevio: e.metodoIngresoPrevio,
          nombreLista: e.nombreLista,
          rangoAsignado: e.rangoAsignado,
        }));
        guardarNominaEnCache(examenId, items);

        // Precarga de fotos para visualización fluida en modo offline (Service Worker cache)
        // Deduplicada para descargar cada foto exactamente una vez
        if (typeof window !== "undefined") {
          for (const item of items) {
            if (item.fotoUrl && !fotosPrecargadasSet.has(item.fotoUrl)) {
              fotosPrecargadasSet.add(item.fotoUrl);
              const img = new Image();
              img.src = item.fotoUrl;
            }
          }
        }

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
        nombreLista: e.nombreLista,
        rangoAsignado: e.rangoAsignado,
        fotoUrl: e.fotoUrl,
      }));
    }

    // 1. Intentar endpoint dedicado de control de ingreso si hay conexión
    if (typeof navigator === "undefined" || navigator.onLine) {
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
              fotoUrl: e.fotoUrl,
              estadoHabilitado: e.estadoHabilitado,
              motivoInhabilitacion: e.motivoInhabilitacion,
              ambienteAsignado: e.ambienteAsignado,
              yaIngreso: e.yaIngreso,
              horaIngresoPrevio: e.horaIngresoPrevio,
              metodoIngresoPrevio: e.metodoIngresoPrevio,
              nombreLista: e.nombreLista,
              rangoAsignado: e.rangoAsignado,
            }))
          );
          return response.data;
        }
      } catch {
        // Continuar con fallback local
      }
    }

    // 2. Fallback local: Buscar en la nómina en caché
    const nominaLocal = obtenerNominaCache(examenId);
    if (nominaLocal.length > 0) {
      const tokens = term.split(/\s+/).filter(Boolean);
      return nominaLocal
        .filter((e) => {
          const campos = [
            e.codSis.toLowerCase(),
            e.nombre.toLowerCase(),
            (e.apellido || "").toLowerCase(),
            (e.ci || "").toLowerCase(),
          ];
          return tokens.every((tk) => campos.some((c) => c.includes(tk)));
        })
        .map((e) => ({
          ...e,
          ci: e.ci || "",
          apellido: e.apellido || "",
          ambienteAsignado: e.ambienteAsignado || "",
          yaIngreso: !!e.yaIngreso,
          nombreLista: e.nombreLista,
          rangoAsignado: e.rangoAsignado,
        }));
    }

    return [];
  },

  /**
   * HU8: Registra el ingreso manual de un estudiante validado en el examen activo.
   * En modo offline, valida que el estudiante pertenezca a la fila/grupo asignado.
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

    // Si el navegador está explícitamente offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const estNomina = buscarEstudianteEnNomina(examenId, payload.identificador);

      // HU17 Offline: Validar si el estudiante pertenece a la fila asignada
      const valGrupo = validarEstudianteEnGrupoOffline(examenId, {
        id: estNomina?.id || payload.estudianteId || 0,
        codSis: estNomina?.codSis || payload.identificador,
        nombre: estNomina?.nombre,
        apellido: estNomina?.apellido,
      });

      if (!valGrupo.pertenece) {
        const error = new Error(
          valGrupo.mensaje || "El estudiante no pertenece a tu fila asignada"
        );
        (error as unknown as { response?: { status: number; data: unknown } }).response = {
          status: 400,
          data: {
            code: "FUERA_DE_GRUPO",
            message: valGrupo.mensaje,
            grupoCorrecto: {
              nombreLista: valGrupo.nombreListaCorrecta,
              rango: valGrupo.rangoCorrecto,
            },
          },
        };
        throw error;
      }

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

        const ingresados = obtenerIngresadosCache(examenId);
        const yaEnCache = ingresados.find(
          (i) =>
            i.estudianteId === estNomina.id || i.codSis === estNomina.codSis
        );
        if (estNomina.yaIngreso || yaEnCache) {
          throw new Error(`El estudiante ya registró su ingreso a este examen`);
        }
      }

      await offlineIngresosService.guardarIngresoOffline(
        examenId,
        payload.identificador,
        estNomina
          ? {
              id: estNomina.id,
              nombre: estNomina.nombre,
              apellido: estNomina.apellido,
              codSis: estNomina.codSis,
            }
          : undefined,
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
          codSis: estNomina?.codSis || payload.identificador,
          ci: estNomina?.ci || "",
          nombre: estNomina?.nombre || "Estudiante",
          apellido: estNomina?.apellido || "",
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
        response?: { status: number; data?: { message?: string; code?: string } };
        code?: string;
      };

      if (!axiosErr.response || axiosErr.code === "ERR_NETWORK") {
        const estNomina = buscarEstudianteEnNomina(examenId, payload.identificador);

        // HU17 Offline: Validar si el estudiante pertenece a la fila asignada
        const valGrupo = validarEstudianteEnGrupoOffline(examenId, {
          id: estNomina?.id || payload.estudianteId || 0,
          codSis: estNomina?.codSis || payload.identificador,
          nombre: estNomina?.nombre,
          apellido: estNomina?.apellido,
        });

        if (!valGrupo.pertenece) {
          const error = new Error(
            valGrupo.mensaje || "El estudiante no pertenece a tu fila asignada"
          );
          (error as unknown as { response?: { status: number; data: unknown } }).response = {
            status: 400,
            data: {
              code: "FUERA_DE_GRUPO",
              message: valGrupo.mensaje,
              grupoCorrecto: {
                nombreLista: valGrupo.nombreListaCorrecta,
                rango: valGrupo.rangoCorrecto,
              },
            },
          };
          throw error;
        }

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

      // Si el backend rechazó porque es de otra lista, relanzar el error para que el componente muestre el diálogo
      const data = axiosErr.response?.data as { code?: string; message?: string; grupoCorrecto?: unknown } | undefined;
      if (data?.code === 'FUERA_DE_GRUPO') {
        throw err;
      }

      if (data?.message) {
        throw new Error(data.message);
      }
      throw err;
    }

    throw new Error("No se pudo registrar el ingreso manual.");
  },

  /**
   * HU8 & HU9: Validación de QR (sin confirmar). Devuelve info del estudiante para previsualizar.
   * Soporta validación offline completa contra la nómina y la partición de filas del controlador.
   */
  async validarYRegistrarQr(examenId: number, tokenQr: string): Promise<ValidacionQrResponse> {
    const rawToken = tokenQr.trim();
    if (!rawToken) {
      return {
        success: false,
        excepcion: "QR_INVALIDO",
        mensaje: "El código QR leído está vacío o no es legible.",
      };
    }

    // Helper interno para procesar la validación cuando estamos offline
    const procesarValidacionQrOffline = (): ValidacionQrResponse => {
      const tokenInfo = parsearTokenQr(rawToken);

      if (!tokenInfo.payload) {
        return {
          success: false,
          excepcion: "QR_INVALIDO",
          mensaje: "Código QR no válido o no reconocido por el sistema.",
        };
      }

      // Validar caducidad
      if (
        tokenInfo.esExpiradoPrueba ||
        (tokenInfo.payload.exp &&
          Math.floor(Date.now() / 1000) > tokenInfo.payload.exp)
      ) {
        return {
          success: false,
          excepcion: "QR_CADUCADO",
          mensaje: "El código QR presentado ha expirado.",
        };
      }

      const subId = tokenInfo.payload.sub || tokenInfo.payload.estudianteId;
      const subSis = tokenInfo.payload.codSis;

      const estudianteNomina = buscarEstudianteEnNomina(
        examenId,
        subId ?? subSis ?? tokenInfo.cleanToken
      );

      if (!estudianteNomina) {
        return {
          success: false,
          excepcion: "NO_HABILITADO",
          motivoInhabilitacion: "El estudiante no figura en la nómina de este examen.",
          mensaje: "El estudiante no figura en la nómina de este examen.",
        };
      }

      const nombreCompleto =
        `${estudianteNomina.nombre} ${estudianteNomina.apellido || ""}`.trim();

      // Validar habilitación académica
      if (!estudianteNomina.estadoHabilitado) {
        const motivo =
          estudianteNomina.motivoInhabilitacion || "Inhabilitado para este examen";
        offlineIncidenciasService
          .guardarIncidenciaOffline(
            {
              examenId: String(examenId),
              codigoSis: estudianteNomina.codSis,
              motivo: "NO_HABILITADO",
              observaciones: motivo,
            },
            nombreCompleto
          )
          .catch(() => {});

        return {
          success: false,
          excepcion: "NO_HABILITADO",
          motivoInhabilitacion: motivo,
          mensaje: `Estudiante no habilitado: ${motivo}`,
        };
      }

      // Validar doble marcación
      const ingresados = obtenerIngresadosCache(examenId);
      const yaEnCache = ingresados.find(
        (i) =>
          i.estudianteId === estudianteNomina.id ||
          i.codSis === estudianteNomina.codSis ||
          i.token === tokenInfo.cleanToken
      );

      if (estudianteNomina.yaIngreso || yaEnCache) {
        const horaPrev =
          estudianteNomina.horaIngresoPrevio ||
          yaEnCache?.hora ||
          "Previa marcación";

        offlineIncidenciasService
          .guardarIncidenciaOffline(
            {
              examenId: String(examenId),
              codigoSis: estudianteNomina.codSis,
              motivo: "DOBLE_MARCACION",
              observaciones: `Intento de ingreso duplicado detectado. Marcación previa: ${horaPrev}`,
            },
            nombreCompleto
          )
          .catch(() => {});

        return {
          success: false,
          excepcion: "YA_REGISTRADO",
          horaIngresoPrevio: horaPrev,
          mensaje: "El estudiante ya registró su ingreso a este examen",
        };
      }

      // HU17: VALIDACIÓN DE FILA / GRUPO EN MODO OFFLINE
      const valGrupo = validarEstudianteEnGrupoOffline(
        examenId,
        estudianteNomina
      );

      if (!valGrupo.pertenece) {
        return {
          success: false,
          excepcion: "FUERA_DE_GRUPO",
          mensaje:
            valGrupo.mensaje ||
            "Este estudiante no pertenece a tu fila asignada.",
          estudiante: {
            id: estudianteNomina.id,
            nombre: estudianteNomina.nombre,
            apellido: estudianteNomina.apellido,
            codSis: estudianteNomina.codSis,
            carrera: "Estudiante",
            horaIngreso: "",
            estadoHabilitado: true,
            fotoUrl: estudianteNomina.fotoUrl || null,
          },
        };
      }

      // QR Válido y listo para confirmación
      return {
        success: true,
        estudiante: {
          id: estudianteNomina.id,
          nombre: estudianteNomina.nombre,
          apellido: estudianteNomina.apellido,
          codSis: estudianteNomina.codSis,
          carrera: "Estudiante",
          horaIngreso: "",
          estadoHabilitado: true,
          yaIngreso: false,
          fotoUrl: estudianteNomina.fotoUrl || null,
        },
        mensaje: "Código QR válido para confirmación",
      };
    };

    // Si no hay conexión activa en el navegador, procesar offline de inmediato
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return procesarValidacionQrOffline();
    }

    try {
      const response = await apiClient.post<ValidacionQrResponse>(
        "/ingresos/qr",
        { examenId, token: rawToken }
      );
      const { data } = response;
      if (data.estudiante?.fotoUrl?.startsWith("/")) {
        const base = response.config.baseURL || "";
        data.estudiante.fotoUrl = `${base}${data.estudiante.fotoUrl}`;
      }
      return data;
    } catch (error) {
      const err = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            code?: string;
            estudiante?: EstudianteQrResultado;
            horaIngresoPrevio?: string;
          };
        };
        code?: string;
      };

      // Si fue error de red o timeout, procesar offline
      if (!err.response || err.code === "ERR_NETWORK") {
        return procesarValidacionQrOffline();
      }

      const errData = err.response?.data;
      const mensaje =
        errData?.message || "No se pudo validar el QR. Se requiere conexión.";

      // Detectar FUERA_DE_GRUPO del backend
      if (errData?.code === "FUERA_DE_GRUPO") {
        return {
          success: false,
          mensaje,
          excepcion: "FUERA_DE_GRUPO",
          estudiante: errData.estudiante,
        };
      }

      return {
        success: false,
        mensaje,
        estudiante: errData?.estudiante,
        horaIngresoPrevio: errData?.horaIngresoPrevio,
        excepcion:
          err.response?.status === 409 || errData?.code === "DOBLE_MARCACION"
            ? "YA_REGISTRADO"
            : /expirado|caducado|revocado/i.test(mensaje)
              ? "QR_CADUCADO"
              : /no habilitado/i.test(mensaje)
                ? "NO_HABILITADO"
                : "QR_INVALIDO",
      };
    }
  },

  /**
   * HU9: Confirma el registro de ingreso por QR (segunda fase).
   * En modo offline, guarda el ingreso en la cola de sincronización y marca al estudiante.
   */
  async confirmarIngresoQr(
    examenId: number,
    tokenQr: string
  ): Promise<ValidacionQrResponse> {
    const rawToken = tokenQr.trim();

    // Helper interno para confirmación offline
    const procesarConfirmacionQrOffline = async (): Promise<ValidacionQrResponse> => {
      const tokenInfo = parsearTokenQr(rawToken);
      const subId = tokenInfo.payload?.sub || tokenInfo.payload?.estudianteId;
      const subSis = tokenInfo.payload?.codSis;

      const estudianteNomina = buscarEstudianteEnNomina(
        examenId,
        subId ?? subSis ?? tokenInfo.cleanToken
      );

      // Re-verificación de grupo por seguridad
      if (estudianteNomina) {
        const valGrupo = validarEstudianteEnGrupoOffline(
          examenId,
          estudianteNomina
        );
        if (!valGrupo.pertenece) {
          return {
            success: false,
            excepcion: "FUERA_DE_GRUPO",
            mensaje:
              valGrupo.mensaje ||
              "El estudiante no pertenece a tu fila asignada.",
          };
        }
      }

      const nombreCompleto = estudianteNomina
        ? `${estudianteNomina.nombre} ${estudianteNomina.apellido || ""}`.trim()
        : "Estudiante";

      const horaFormateada = new Date().toLocaleTimeString("es-BO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "America/La_Paz",
      });

      const totalPendientes = await offlineIngresosService.guardarIngresoOffline(
        examenId,
        tokenInfo.cleanToken,
        {
          id: estudianteNomina?.id,
          nombre: nombreCompleto,
          codSis: estudianteNomina?.codSis,
        },
        "QR"
      );

      // Actualizar estado en nómina local
      if (estudianteNomina) {
        estudianteNomina.yaIngreso = true;
        estudianteNomina.horaIngresoPrevio = horaFormateada;
        estudianteNomina.metodoIngresoPrevio = "QR";

        const nomina = obtenerNominaCache(examenId);
        const idx = nomina.findIndex((e) => e.id === estudianteNomina.id);
        if (idx !== -1) {
          nomina[idx] = { ...estudianteNomina };
          guardarNominaEnCache(examenId, nomina);
        }

        registrarIngresadoEnCache(examenId, {
          estudianteId: estudianteNomina.id,
          codSis: estudianteNomina.codSis,
          nombre: nombreCompleto,
          hora: horaFormateada,
          token: tokenInfo.cleanToken,
        });
      }

      return {
        success: true,
        ingresoId: -1,
        fechaHora: new Date().toISOString(),
        estudiante: {
          id: estudianteNomina?.id || 0,
          nombre: nombreCompleto,
          apellido: estudianteNomina?.apellido || "",
          codSis: estudianteNomina?.codSis || "",
          carrera: "Estudiante",
          horaIngreso: horaFormateada,
          estadoHabilitado: true,
          yaIngreso: true,
          fotoUrl: estudianteNomina?.fotoUrl || null,
        },
        mensaje: "Ingreso confirmado y guardado sin conexión",
        pendientesOffline: totalPendientes,
      };
    };

    // Si estamos sin conexión, confirmar localmente
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return procesarConfirmacionQrOffline();
    }

    try {
      const response = await apiClient.post<ValidacionQrResponse>(
        "/ingresos/qr/confirmar",
        { examenId, token: rawToken }
      );
      return response.data;
    } catch (error) {
      const err = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            code?: string;
            estudiante?: EstudianteQrResultado;
            horaIngresoPrevio?: string;
          };
        };
        code?: string;
      };

      // Si fue error de red o timeout, confirmar offline
      if (!err.response || err.code === "ERR_NETWORK") {
        return procesarConfirmacionQrOffline();
      }

      const errData = err.response?.data;
      const mensaje = errData?.message || "No se pudo confirmar el ingreso.";

      if (errData?.code === "FUERA_DE_GRUPO") {
        return {
          success: false,
          mensaje,
          excepcion: "FUERA_DE_GRUPO",
          estudiante: errData.estudiante,
        };
      }

      return {
        success: false,
        mensaje,
        estudiante: errData?.estudiante,
        horaIngresoPrevio: errData?.horaIngresoPrevio,
        excepcion:
          err.response?.status === 409 || errData?.code === "DOBLE_MARCACION"
            ? "YA_REGISTRADO"
            : "QR_INVALIDO",
      };
    }
  },
};
