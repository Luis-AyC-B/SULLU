// src/features/incidencias/api/incidencias.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isAxiosError } from "axios";
import { apiClient } from "@/shared/lib/api-client";
import {
  idbGet,
  idbPut,
  SULLU_STORES,
} from "@/shared/lib/offline-sullu-db";
import {
  examenesIncidenciaSchema,
  incidenciaSchema,
  incidenciasSchema,
  obtenerGestionPorFecha,
  filtrarIncidenciasPorMotivo,
  type CrearIncidenciaPayload,
  type ExamenIncidencia,
  type Incidencia,
  type FiltrosIncidencias,
} from "../types/incidencias.types";
import { offlineIncidenciasService } from "../services/offline-incidencias.service";
import {
  formatearNombreArchivoObservaciones,
  obtenerNombreMateriaIncidencia,
} from "../lib/formatoReporteUtils";

/* -------------------------------------------------------------------------- */
/* Errores                                                                    */
/* -------------------------------------------------------------------------- */

export type IncidenciaErrorCode =
  | "SIS_NO_EXISTE"
  | "EXAMEN_INVALIDO"
  | "SIN_CONEXION"
  | "DESCONOCIDO";

const MENSAJES_ERROR: Record<IncidenciaErrorCode, string> = {
  SIS_NO_EXISTE: "El código SIS ingresado no existe",
  EXAMEN_INVALIDO: "El examen seleccionado no es válido",
  SIN_CONEXION:
    "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
  DESCONOCIDO: "Ocurrió un error inesperado. Intenta de nuevo.",
};

export class IncidenciaServiceError extends Error {
  readonly code: IncidenciaErrorCode;

  constructor(code: IncidenciaErrorCode) {
    super(MENSAJES_ERROR[code]);
    this.name = "IncidenciaServiceError";
    this.code = code;
  }
}

function leerCodigo(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const data: unknown = error.response?.data;
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function esRutaInexistente(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    error.response?.status === 404 &&
    leerCodigo(error) === undefined
  );
}

function aServiceError(error: unknown): IncidenciaServiceError {
  if (error instanceof IncidenciaServiceError) return error;
  if (isAxiosError(error)) {
    if (!error.response) return new IncidenciaServiceError("SIN_CONEXION");
    const code = leerCodigo(error);
    if (code === "SIS_NO_EXISTE" || code === "EXAMEN_INVALIDO") {
      return new IncidenciaServiceError(code);
    }
  }
  return new IncidenciaServiceError("DESCONOCIDO");
}

/* -------------------------------------------------------------------------- */
/* API con soporte offline                                                    */
/* -------------------------------------------------------------------------- */

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const EXAMENES_CACHE_KEY = "sullu_examenes_incidencias_cache";
const INCIDENCIAS_CACHE_PREFIX = "sullu_incidencias_examen_";

function ordenarMasRecientes(items: Incidencia[]): Incidencia[] {
  return [...items].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
  );
}

function enriquecerExamenIncidencia(e: any): ExamenIncidencia {
  const nombre =
    e.nombre ||
    `${e.materiaNombre || e.materia?.nombre || "Materia"} – ${
      e.tipoExamen || "Examen"
    }`;
  const facultad =
    e.facultadNombre ||
    e.facultad?.nombre ||
    e.facultad ||
    "Facultad de Ciencias y Tecnología (FCyT)";
  const carrera =
    e.carreraNombre ||
    e.carrera?.nombre ||
    e.carrera ||
    "Licenciatura en Informática";
  const materia =
    e.materiaNombre ||
    e.materia?.nombre ||
    e.materia ||
    obtenerNombreMateriaIncidencia(nombre);
  const docente =
    (e.docenteNombre && e.docenteNombre !== "Docente asignado"
      ? e.docenteNombre
      : "") ||
    (typeof e.docente === "object"
      ? `${e.docente.nombre || ""} ${e.docente.apellido || ""}`.trim()
      : typeof e.docente === "string" && e.docente !== "Docente asignado"
      ? e.docente
      : "") ||
    (e.responsable
      ? `${e.responsable.nombre || ""} ${e.responsable.apellido || ""}`.trim()
      : "") ||
    (e.usuario
      ? `${e.usuario.nombre || ""} ${e.usuario.apellido || ""}`.trim()
      : "") ||
    "";

  return {
    id: String(e.id),
    nombre,
    fecha:
      e.fecha ||
      (e.reservaAmbiente?.fecha
        ? String(e.reservaAmbiente.fecha).slice(0, 10)
        : "2026-09-20"),
    facultad,
    facultadId: e.facultadId
      ? String(e.facultadId)
      : facultad.toLowerCase().includes("econ")
      ? "fce"
      : "fcyt",
    carrera,
    carreraId: e.carreraId
      ? String(e.carreraId)
      : carrera.toLowerCase().includes("sist")
      ? "sistemas"
      : carrera.toLowerCase().includes("admin")
      ? "adm"
      : "inf",
    materia,
    materiaId: e.materiaId ? String(e.materiaId) : materia,
    docente,
    docenteId: e.docenteId
      ? String(e.docenteId)
      : e.usuarioId
      ? String(e.usuarioId)
      : e.responsable?.id
      ? String(e.responsable.id)
      : e.usuario?.id
      ? String(e.usuario.id)
      : docente
      ? docente
      : "",
    gestion: e.gestion || obtenerGestionPorFecha(e.fecha || "2026-09-20"),
    ambiente: e.ambienteNombre || e.ambiente?.nombre || e.ambiente || "Aula",
    horario:
      e.horario || `${e.horaInicio || "08:00"} - ${e.horaFin || "09:30"}`,
    estado: e.estado || "Activo",
  };
}

/**
 * Obtiene exámenes cacheados desde cualquier módulo disponible
 * (incidencias, registro-ingresos o control-ingreso).
 */
export function obtenerExamenesIncidenciasFallback(): ExamenIncidencia[] {
  if (typeof window === "undefined") return [];

  // 1. Probar caché específico de incidencias
  const rawInc = localStorage.getItem(EXAMENES_CACHE_KEY);
  if (rawInc) {
    try {
      const parsed = examenesIncidenciaSchema.parse(JSON.parse(rawInc));
      if (parsed.length > 0) return parsed;
    } catch {}
  }

  // 2. Probar caché de registro-ingresos
  const rawCtrl = localStorage.getItem("sullu_examenes_control_cache");
  if (rawCtrl) {
    try {
      const items = JSON.parse(rawCtrl) as any[];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((i) => enriquecerExamenIncidencia(i));
      }
    } catch {}
  }

  // 3. Probar caché de control-ingreso
  const rawAsig = localStorage.getItem("sullu_examenes_asignados_cache");
  if (rawAsig) {
    try {
      const items = JSON.parse(rawAsig) as any[];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((i) => enriquecerExamenIncidencia(i));
      }
    } catch {}
  }

  // 4. Probar examen activo en sesión (control-ingreso)
  try {
    const rawActive = sessionStorage.getItem("exacontrol_active_exam");
    if (rawActive) {
      const active = JSON.parse(rawActive) as {
        id?: number | string;
        examenId?: number | string;
        nombre?: string;
        asignatura?: string;
        fecha?: string;
      };
      if (active && (active.id || active.examenId)) {
        return [enriquecerExamenIncidencia(active)];
      }
    }
  } catch {}

  return [];
}

// GET /incidencias/examenes
export async function getExamenesIncidencias(): Promise<ExamenIncidencia[]> {
  if (USE_MOCKS) return mockGetExamenes();

  // Si no hay red proactivamente, buscar en la caché compartida
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const fallback = obtenerExamenesIncidenciasFallback();
    if (fallback.length > 0) return fallback;
  }

  const mapa = new Map<string, ExamenIncidencia>();

  // 1. Intentar endpoint /examenes/control (endpoint real del backend con docentes, materias y alcances por rol)
  try {
    const { data } = await apiClient.get("/examenes/control");
    const list = Array.isArray(data) ? data : (data as any)?.data;
    if (Array.isArray(list) && list.length > 0) {
      list.forEach((e) => {
        const enriched = enriquecerExamenIncidencia(e);
        mapa.set(String(enriched.id), enriched);
      });
      const resultado = Array.from(mapa.values());
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(EXAMENES_CACHE_KEY, JSON.stringify(resultado));
        } catch {}
      }
      return resultado;
    }
  } catch {}

  // 2. Intentar endpoint de incidencias/examenes
  try {
    const { data } = await apiClient.get("/incidencias/examenes");
    const parsed = examenesIncidenciaSchema.parse(data);
    parsed.forEach((e) => {
      const enriched = enriquecerExamenIncidencia(e);
      mapa.set(String(enriched.id), enriched);
    });
  } catch (error) {
    if (esRutaInexistente(error)) {
      // Continuar con otras fuentes
    }
  }

  // 3. Intentar endpoint general /examenes (para Admin y catálogo completo)
  try {
    const { data } = await apiClient.get("/examenes");
    const list = Array.isArray(data) ? data : (data as any)?.data;
    if (Array.isArray(list)) {
      list.forEach((e) => {
        const enriched = enriquecerExamenIncidencia(e);
        const existing = mapa.get(String(enriched.id));
        mapa.set(String(enriched.id), existing ? { ...enriched, ...existing } : enriched);
      });
    }
  } catch {}

  // 3. Integrar con exámenes de IndexedDB
  try {
    if (typeof window !== "undefined" && window.indexedDB) {
      const { dbService } = await import("@/shared/lib/db/indexedDB");
      const localDbExams = await dbService.getAllExams().catch(() => []);
      if (Array.isArray(localDbExams)) {
        localDbExams.forEach((e) => {
          const enriched = enriquecerExamenIncidencia(e);
          if (!mapa.has(String(enriched.id))) {
            mapa.set(String(enriched.id), enriched);
          }
        });
      }
    }
  } catch {}

  const resultado = Array.from(mapa.values());
  if (resultado.length > 0) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(EXAMENES_CACHE_KEY, JSON.stringify(resultado));
      } catch {}
    }
    return resultado;
  }

  // Fallback offline o mock por defecto
  const fallback = obtenerExamenesIncidenciasFallback();
  if (fallback.length > 0) return fallback;

  return mockGetExamenes();
}

// GET /examenes/:id/incidencias
export async function getIncidenciasExamen(
  examenId: string
): Promise<Incidencia[]> {
  if (USE_MOCKS) return mockGetIncidencias(examenId);

  // Si se pide "TODOS", devolver arreglo vacío (se usa getIncidenciasConsolidadas)
  if (!examenId || String(examenId).toUpperCase() === "TODOS") {
    return [];
  }

  // Combinar incidencias pendientes locales con las del servidor
  const pendientesLocales = offlineIncidenciasService
    .obtenerPendientesSync(examenId)
    .map((p) => ({
      id: p.id,
      examenId: p.examenId,
      fechaHora: p.fechaHoraCaptura,
      codigoSis: p.codigoSis,
      estudianteNombre: p.estudianteNombre || "Estudiante (offline)",
      motivo: p.motivo,
      observaciones: p.observaciones ?? null,
      registradoPor: "Control (offline)",
    }));

  // Si no hay conexión proactivamente, responder de inmediato con la caché local
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    let cacheadas: Incidencia[] = [];
    try {
      const record = await idbGet<{
        examenId: number;
        cachedAt: string;
        data: Incidencia[];
      }>(SULLU_STORES.INCIDENCIAS_VISTA, Number(examenId));
      if (record && record.data) cacheadas = record.data;
    } catch {}

    if (cacheadas.length === 0 && typeof window !== "undefined") {
      const raw = localStorage.getItem(`${INCIDENCIAS_CACHE_PREFIX}${examenId}`);
      if (raw) {
        try {
          cacheadas = incidenciasSchema.parse(JSON.parse(raw));
        } catch {}
      }
    }

    const idSetC = new Set(cacheadas.map((c) => String(c.id)));
    const pendientesFiltradosC = pendientesLocales.filter(
      (p) => !idSetC.has(String(p.id))
    );
    return ordenarMasRecientes([...pendientesFiltradosC, ...cacheadas]);
  }

  try {
    const { data } = await apiClient.get(
      `/examenes/${encodeURIComponent(examenId)}/incidencias`
    );

    const parsed = incidenciasSchema.parse(data);

    // Guardar en cache offline
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `${INCIDENCIAS_CACHE_PREFIX}${examenId}`,
          JSON.stringify(parsed)
        );
        await idbPut(SULLU_STORES.INCIDENCIAS_VISTA, {
          examenId: Number(examenId),
          cachedAt: new Date().toISOString(),
          data: parsed,
        });
      } catch {
        // Ignorar
      }
    }

    const idSet = new Set(parsed.map((p) => String(p.id)));
    const pendientesFiltrados = pendientesLocales.filter(
      (p) => !idSet.has(String(p.id))
    );
    return ordenarMasRecientes([...pendientesFiltrados, ...parsed]);
  } catch (error) {
    if (esRutaInexistente(error)) return mockGetIncidencias(examenId);

    // Fallback offline: buscar en IndexedDB, luego en localStorage
    let cacheadas: Incidencia[] = [];
    try {
      const record = await idbGet<{
        examenId: number;
        cachedAt: string;
        data: Incidencia[];
      }>(SULLU_STORES.INCIDENCIAS_VISTA, Number(examenId));

      if (record && record.data) {
        cacheadas = record.data;
      }
    } catch {}

    if (cacheadas.length === 0 && typeof window !== "undefined") {
      const raw = localStorage.getItem(`${INCIDENCIAS_CACHE_PREFIX}${examenId}`);
      if (raw) {
        try {
          cacheadas = incidenciasSchema.parse(JSON.parse(raw));
        } catch {}
      }
    }

    const sinConexion =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      (isAxiosError(error) && (!error.response || error.code === "ERR_NETWORK"));

    if (sinConexion || cacheadas.length > 0 || pendientesLocales.length > 0) {
      return ordenarMasRecientes([...pendientesLocales, ...cacheadas]);
    }

    // Si el backend responde 403 (Forbidden), para este examen no hay observaciones accesibles
    // para el rol actual (ej. Administrador en endpoints restringidos al docente creador).
    // Devolvemos arreglo vacío de manera segura en lugar de romper con un error fatal.
    if (isAxiosError(error) && error.response?.status === 403) {
      return [];
    }

    // Si el examen no existe en la base de datos remota (404 o EXAMEN_INVALIDO, ej: examen mock o ID local),
    // consultar el mock local de incidencias o devolver lista vacía en vez de romper la pantalla.
    const codigoError = leerCodigo(error);
    if (
      (isAxiosError(error) && error.response?.status === 404) ||
      codigoError === "EXAMEN_INVALIDO"
    ) {
      const mockData = await mockGetIncidencias(examenId);
      if (mockData.length > 0) return mockData;
      return [];
    }

    throw aServiceError(error);
  }
}

/**
 * Obtiene las incidencias consolidadas para múltiples exámenes
 * (utilizado cuando el filtro de examen es "TODOS").
 */
export async function getIncidenciasConsolidadas(
  examenIds: string[]
): Promise<Incidencia[]> {
  if (USE_MOCKS) {
    if (examenIds.length === 0) return ordenarMasRecientes(mockIncidencias);
    return ordenarMasRecientes(
      mockIncidencias.filter((inc) => examenIds.includes(String(inc.examenId)))
    );
  }

  // Pendientes locales que aún no se sincronizan
  const pendientesLocales: Incidencia[] = offlineIncidenciasService
    .obtenerTodosSync()
    .filter((p) => !p.sincronizado)
    .map((p) => ({
      id: String(p.id),
      examenId: String(p.examenId),
      fechaHora: p.fechaHoraCaptura,
      codigoSis: String(p.codigoSis),
      estudianteNombre: p.estudianteNombre || "Estudiante",
      motivo: p.motivo,
      observaciones: p.observaciones ?? null,
      registradoPor: "Controlador (offline)",
    }));

  let targetIds = examenIds.filter((id) => id !== "TODOS");

  if (targetIds.length === 0) {
    const fallbackExamenes = obtenerExamenesIncidenciasFallback();
    if (fallbackExamenes.length > 0) {
      targetIds = fallbackExamenes.map((e) => String(e.id));
    }
  }

  if (targetIds.length === 0) {
    return ordenarMasRecientes(pendientesLocales);
  }

  const promesas = targetIds.map((id) => getIncidenciasExamen(id).catch(() => []));
  const resultados = await Promise.all(promesas);
  const mapa = new Map<string, Incidencia>();
  pendientesLocales.forEach((inc) => mapa.set(String(inc.id), inc));
  resultados.flat().forEach((inc) => mapa.set(String(inc.id), inc));
  return ordenarMasRecientes(Array.from(mapa.values()));
}

// POST /incidencias (soporta offline proactivo y reactivo)
export async function crearIncidencia(
  payload: CrearIncidenciaPayload
): Promise<Incidencia> {
  if (USE_MOCKS) return mockCrearIncidencia(payload);

  // Modo offline proactivo
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return offlineIncidenciasService.guardarIncidenciaOffline(payload);
  }

  try {
    const { data } = await apiClient.post("/incidencias", payload);
    return incidenciaSchema.parse(data);
  } catch (error) {
    if (esRutaInexistente(error)) return mockCrearIncidencia(payload);

    // Si falló por falta de red, guardar en cola offline
    if (isAxiosError(error) && (!error.response || error.code === "ERR_NETWORK")) {
      return offlineIncidenciasService.guardarIncidenciaOffline(payload);
    }

    throw aServiceError(error);
  }
}

/**
 * HU-18: Obtener observaciones de ingreso filtrables desde el backend con soporte de roles.
 * Endpoint principal: GET /observaciones-ingreso
 */
export async function getObservacionesIngreso(
  filtros: FiltrosIncidencias
): Promise<{ total: number; items: Incidencia[] }> {
  if (USE_MOCKS) {
    let list = mockIncidencias;
    if (filtros.examenId && filtros.examenId !== "TODOS") {
      list = list.filter((i) => String(i.examenId) === String(filtros.examenId));
    }
    const filtradas = filtrarIncidenciasPorMotivo(list, filtros.motivo);
    return { total: filtradas.length, items: filtradas };
  }

  // Si no hay conexión en el navegador, responder inmediatamente desde la caché e incidencias locales
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (filtros.examenId && filtros.examenId !== "TODOS") {
      const local = await getIncidenciasExamen(filtros.examenId);
      const filtradas = filtrarIncidenciasPorMotivo(local, filtros.motivo);
      return { total: filtradas.length, items: filtradas };
    }
    const all = await getIncidenciasConsolidadas([]);
    const filtradas = filtrarIncidenciasPorMotivo(all, filtros.motivo);
    return { total: filtradas.length, items: filtradas };
  }

  const params: Record<string, string> = {};
  if (filtros.gestion) params.gestion = filtros.gestion;
  if (filtros.facultadId && filtros.facultadId !== "TODAS") {
    params.facultadId = filtros.facultadId;
  }
  if (filtros.carreraId && filtros.carreraId !== "TODAS") {
    params.carreraId = filtros.carreraId;
  }
  if (filtros.docenteId && filtros.docenteId !== "TODOS") {
    params.docenteId = filtros.docenteId;
  }
  if (filtros.materiaId && filtros.materiaId !== "TODAS") {
    params.materiaId = filtros.materiaId;
  }
  if (filtros.examenId && filtros.examenId !== "TODOS") {
    params.examenId = filtros.examenId;
  }
  if (filtros.motivo && filtros.motivo !== "TODOS") {
    params.motivo = filtros.motivo;
  }

  try {
    const { data } = await apiClient.get<{ total: number; items: any[] }>(
      "/observaciones-ingreso",
      { params }
    );

    const rawItems = Array.isArray(data) ? data : (data?.items || []);
    const items: Incidencia[] = rawItems.map((r: any) => {
      let fh = r.fechaHora;
      if (r.hora && r.hora !== "—") {
        if (!fh || fh.endsWith("T00:00:00.000Z") || fh.includes("00:00:00")) {
          const baseDate = fh ? fh.slice(0, 10) : new Date().toISOString().slice(0, 10);
          fh = `${baseDate}T${r.hora.slice(0, 5)}`;
        } else if (r.motivo === "NO_ASISTIO") {
          fh = r.hora.slice(0, 5);
        }
      }
      return {
        id: String(r.id),
        examenId: String(r.examenId ?? ""),
        fechaHora: fh || new Date().toISOString(),
        codigoSis: String(r.codigoSis ?? ""),
        estudianteNombre: r.estudiante || r.estudianteNombre || "Estudiante",
        motivo: r.motivo,
        observaciones: r.observaciones ?? null,
        registradoPor: r.registradoPor || "Controlador",
      };
    });

    // Filtramos en cliente para asegurar soporte de motivos extendidos como NO_ASISTIO
    const filtradas = filtrarIncidenciasPorMotivo(items, filtros.motivo);

    return {
      total: filtradas.length,
      items: ordenarMasRecientes(filtradas),
    };
  } catch (error) {
    const sinConexion =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      (isAxiosError(error) &&
        (!error.response ||
          error.code === "ERR_NETWORK" ||
          error.code === "ECONNABORTED"));

    if (sinConexion || esRutaInexistente(error)) {
      if (filtros.examenId && filtros.examenId !== "TODOS") {
        const local = await getIncidenciasExamen(filtros.examenId);
        const filtradas = filtrarIncidenciasPorMotivo(local, filtros.motivo);
        return { total: filtradas.length, items: filtradas };
      }
      const all = await getIncidenciasConsolidadas([]);
      const filtradas = filtrarIncidenciasPorMotivo(all, filtros.motivo);
      return { total: filtradas.length, items: filtradas };
    }

    if (isAxiosError(error)) {
      if (error.response?.status === 403) {
        return { total: 0, items: [] };
      }
      if (error.response?.status === 400) {
        const rawMsg = error.response.data?.message || "Parámetros de búsqueda inválidos.";
        const msgStr = Array.isArray(rawMsg) ? rawMsg.join(", ") : String(rawMsg);
        // Si el backend rechaza un motivo que no conoce (ej: NO_ASISTIO), devolvemos lista vacía
        // mostrando "Sin observaciones" en lugar de mostrar un banner de error rojo al usuario.
        if (msgStr.toLowerCase().includes("motivo no válido") || msgStr.toLowerCase().includes("motivo")) {
          return { total: 0, items: [] };
        }
        throw new Error(msgStr);
      }
      if (error.response?.status === 401) {
        throw new Error("Sesión no autorizada o expirada. Por favor, inicia sesión nuevamente.");
      }
    }

    throw aServiceError(error);
  }
}

/**
 * HU-18: Descargar Reporte de Observaciones de Ingreso en PDF (Criterios 16-21, 23-27, 32).
 * Disponible para todos los roles con acceso al módulo.
 */
export async function descargarReporteObservacionesPdf(
  examen: ExamenIncidencia | null | undefined,
  incidencias: Incidencia[],
  filtroMotivo: string = "TODOS",
  generadoPor?: string,
  filtrosAplicados?: {
    facultad?: string;
    facultadId?: string;
    carrera?: string;
    carreraId?: string;
    docente?: string;
    docenteId?: string;
    materia?: string;
    materiaId?: string;
    gestion?: string;
    examen?: string;
    examenId?: string;
    motivo?: string;
  }
): Promise<{ blob: Blob; filename: string }> {
  const filename = formatearNombreArchivoObservaciones({
    facultad: filtrosAplicados?.facultad,
    materia:
      filtrosAplicados?.materia ||
      (filtrosAplicados?.materiaId !== "TODAS"
        ? filtrosAplicados?.materiaId
        : undefined),
    gestion: filtrosAplicados?.gestion,
    fecha: examen?.fecha || new Date().toISOString().slice(0, 10),
    nombreExamen: examen?.nombre,
  });

  const { generarPdfReporteObservaciones } = await import(
    "../lib/generarPdfReporteObservaciones"
  );
  const blob = await generarPdfReporteObservaciones({
    examen,
    incidencias,
    filtroMotivo,
    filtrosAplicados,
    generadoPor,
  });

  return { blob, filename };
}

/* -------------------------------------------------------------------------- */
/* Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const MOCK_DELAY_MS = 200;
const MOCK_USUARIO = "Carlos Mendoza";
const SIS_SIMULA_CAIDA = "999999999";

const delay = (ms = MOCK_DELAY_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const MOCK_EXAMENES_INCIDENCIAS: ExamenIncidencia[] = [
  {
    id: "1",
    nombre: "Bases de Datos I – Primer parcial",
    fecha: "2026-10-19",
    facultad: "Facultad de Ciencias y Tecnología (FCyT)",
    facultadId: "fcyt",
    carrera: "Ingeniería de Sistemas",
    carreraId: "sistemas",
    materia: "Bases de Datos I",
    materiaId: "bd-1",
    docente: "Lic. Ana Rojas",
    docenteId: "doc-1",
    gestion: "Gestión 2/2026",
  },
  {
    id: "2",
    nombre: "Cálculo II – Examen Final",
    fecha: "2026-09-06",
    facultad: "Facultad de Ciencias y Tecnología (FCyT)",
    facultadId: "fcyt",
    carrera: "Licenciatura en Informática",
    carreraId: "inf",
    materia: "Cálculo II",
    materiaId: "calc-2",
    docente: "Lic. Ana Rojas",
    docenteId: "doc-1",
    gestion: "Gestión 2/2026",
  },
  {
    id: "3",
    nombre: "Programación II – Examen Final",
    fecha: "2026-09-08",
    facultad: "Facultad de Ciencias y Tecnología (FCyT)",
    facultadId: "fcyt",
    carrera: "Ingeniería de Sistemas",
    carreraId: "sistemas",
    materia: "Programación II",
    materiaId: "prog-2",
    docente: "Lic. Carlos Mendoza",
    docenteId: "doc-2",
    gestion: "Gestión 2/2026",
  },
  {
    id: "4",
    nombre: "Física I – Examen Parcial",
    fecha: "2026-09-07",
    facultad: "Facultad de Ciencias y Tecnología (FCyT)",
    facultadId: "fcyt",
    carrera: "Licenciatura en Informática",
    carreraId: "inf",
    materia: "Física I",
    materiaId: "fis-1",
    docente: "Lic. Carlos Mendoza",
    docenteId: "doc-2",
    gestion: "Gestión 2/2026",
  },
  {
    id: "5",
    nombre: "Contabilidad I – Primer parcial",
    fecha: "2026-10-15",
    facultad: "Facultad de Ciencias Económicas (FCE)",
    facultadId: "fce",
    carrera: "Administración de Empresas",
    carreraId: "adm",
    materia: "Contabilidad I",
    materiaId: "cont-1",
    docente: "Lic. Juan Pérez",
    docenteId: "doc-3",
    gestion: "Gestión 2/2026",
  },
  {
    id: "6",
    nombre: "Cálculo II – Primer parcial",
    fecha: "2026-04-10",
    facultad: "Facultad de Ciencias y Tecnología (FCyT)",
    facultadId: "fcyt",
    carrera: "Licenciatura en Informática",
    carreraId: "inf",
    materia: "Cálculo II",
    materiaId: "calc-2",
    docente: "Lic. Ana Rojas",
    docenteId: "doc-1",
    gestion: "Gestión 1/2026",
  },
];

const MOCK_ESTUDIANTES: Record<string, string> = {
  "202104321": "Sofía Aguilar Céspedes",
  "202003456": "Andrés Villarroel Rocha",
  "201905678": "Camila Méndez García",
  "202102345": "Joaquín Torrico Rojas",
  "201900123": "Ana Rojas Mamani",
  "202001456": "Diego Flores Vargas",
  "201902345": "Valeria López Quispe",
  "202103678": "Mateo Pérez Arce",
  "202002789": "Lucía Salazar Ríos",
  "201901567": "Gabriel Fernández Soto",
};

function mockIncidencia(
  id: string,
  examenId: string,
  fechaHora: string,
  codigoSis: string,
  motivo = "NO_HABILITADO",
  usuario = MOCK_USUARIO
): Incidencia {
  return {
    id,
    examenId,
    fechaHora,
    codigoSis,
    estudianteNombre: MOCK_ESTUDIANTES[codigoSis] ?? "Estudiante",
    motivo,
    observaciones: null,
    registradoPor: usuario,
  };
}

export const mockIncidencias: Incidencia[] = [
  mockIncidencia("1", "1", "2026-10-19T09:03:44-04:00", "202104321", "NO_HABILITADO", "Carlos Mendoza"),
  mockIncidencia("2", "1", "2026-10-19T09:02:15-04:00", "202003456", "DOBLE_MARCACION", "Carlos Mendoza"),
  mockIncidencia("3", "1", "2026-10-19T09:00:52-04:00", "201905678", "QR_NO_VALIDO", "Carlos Mendoza"),
  mockIncidencia("4", "1", "2026-10-19T08:59:18-04:00", "202102345", "NO_HABILITADO", "Carlos Mendoza"),
  mockIncidencia("5", "3", "2026-09-08T10:15:30-04:00", "202002789", "QR_OTRO_EXAMEN", "Carlos Mendoza"),
  mockIncidencia("6", "2", "2026-09-06T08:45:10-04:00", "201900123", "QR_VENCIDO", "Edgar"),
  mockIncidencia("7", "5", "2026-10-15T11:20:00-04:00", "202001456", "NO_HABILITADO", "Juan Pérez"),
  mockIncidencia("8", "1", "2026-10-19T09:40:00-04:00", "201901567", "NO_ASISTIO", "Sistema"),
];

async function mockGetExamenes(): Promise<ExamenIncidencia[]> {
  await delay();
  return MOCK_EXAMENES_INCIDENCIAS.map((examen) => ({ ...examen }));
}

async function mockGetIncidencias(examenId: string): Promise<Incidencia[]> {
  await delay();
  if (!examenId || String(examenId).toUpperCase() === "TODOS") {
    return ordenarMasRecientes(mockIncidencias);
  }
  return ordenarMasRecientes(
    mockIncidencias.filter((incidencia) => String(incidencia.examenId) === String(examenId))
  );
}

async function mockCrearIncidencia(
  payload: CrearIncidenciaPayload
): Promise<Incidencia> {
  await delay();

  if (payload.codigoSis === SIS_SIMULA_CAIDA) {
    throw new IncidenciaServiceError("SIN_CONEXION");
  }
  if (!MOCK_EXAMENES_INCIDENCIAS.some((examen) => String(examen.id) === String(payload.examenId))) {
    throw new IncidenciaServiceError("EXAMEN_INVALIDO");
  }
  const estudianteNombre = MOCK_ESTUDIANTES[payload.codigoSis];
  if (!estudianteNombre) {
    throw new IncidenciaServiceError("SIS_NO_EXISTE");
  }

  const nueva: Incidencia = {
    id: `mock-${Date.now()}`,
    examenId: payload.examenId,
    fechaHora: new Date().toISOString(),
    codigoSis: payload.codigoSis,
    estudianteNombre,
    motivo: payload.motivo,
    observaciones: payload.observaciones ?? null,
    registradoPor: MOCK_USUARIO,
  };
  mockIncidencias.push(nueva);
  return { ...nueva };
}
