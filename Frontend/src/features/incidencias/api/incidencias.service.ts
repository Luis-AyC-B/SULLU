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
  type CrearIncidenciaPayload,
  type ExamenIncidencia,
  type Incidencia,
} from "../types/incidencias.types";
import { offlineIncidenciasService } from "../services/offline-incidencias.service";

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
      const items = JSON.parse(rawCtrl) as Array<{
        id: string | number;
        nombre: string;
        fecha: string;
      }>;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((i) => ({
          id: String(i.id),
          nombre: i.nombre || "Examen",
          fecha: i.fecha || new Date().toISOString().slice(0, 10),
        }));
      }
    } catch {}
  }

  // 3. Probar caché de control-ingreso (el que se carga al entrar a /control-ingreso)
  const rawAsig = localStorage.getItem("sullu_examenes_asignados_cache");
  if (rawAsig) {
    try {
      const items = JSON.parse(rawAsig) as Array<{
        id: number;
        asignatura?: string;
        nombre?: string;
        fecha?: string;
      }>;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((i) => ({
          id: String(i.id),
          nombre: i.nombre || i.asignatura || "Examen",
          fecha: i.fecha || new Date().toISOString().slice(0, 10),
        }));
      }
    } catch {}
  }

  // 4. Probar examen activo en sesión (HU7/HU8)
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
        return [
          {
            id: String(active.id || active.examenId),
            nombre: active.nombre || active.asignatura || "Examen",
            fecha: active.fecha || new Date().toISOString().slice(0, 10),
          },
        ];
      }
    }
  } catch {}

  // 5. Probar portal del estudiante
  try {
    const rawPortal = localStorage.getItem("exacontrol_offline_examenes");
    if (rawPortal) {
      const parsed = JSON.parse(rawPortal);
      const data = parsed.data || parsed;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(
          (item: {
            id?: string | number;
            examenId?: string | number;
            materia?: string;
            asignatura?: string;
            nombre?: string;
            fecha?: string;
          }) => ({
            id: String(item.id || item.examenId),
            nombre:
              item.materia || item.asignatura || item.nombre || "Examen",
            fecha: item.fecha || new Date().toISOString().slice(0, 10),
          })
        );
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

  try {
    const { data } = await apiClient.get("/incidencias/examenes");
    const parsed = examenesIncidenciaSchema.parse(data);

    if (typeof window !== "undefined" && parsed.length > 0) {
      try {
        localStorage.setItem(EXAMENES_CACHE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignorar
      }
    }

    return parsed;
  } catch (error) {
    if (esRutaInexistente(error)) return mockGetExamenes();

    // Fallback offline cruzado de exámenes
    const fallback = obtenerExamenesIncidenciasFallback();
    if (fallback.length > 0) {
      return fallback;
    }

    throw aServiceError(error);
  }
}

// GET /examenes/:id/incidencias
export async function getIncidenciasExamen(
  examenId: string
): Promise<Incidencia[]> {
  if (USE_MOCKS) return mockGetIncidencias(examenId);

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
    const pendientesFiltradosC = pendientesLocales.filter((p) => !idSetC.has(String(p.id)));
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
    const pendientesFiltrados = pendientesLocales.filter((p) => !idSet.has(String(p.id)));
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
    } catch {
      // Continuar a localStorage
    }

    if (cacheadas.length === 0 && typeof window !== "undefined") {
      const raw = localStorage.getItem(`${INCIDENCIAS_CACHE_PREFIX}${examenId}`);
      if (raw) {
        try {
          cacheadas = incidenciasSchema.parse(JSON.parse(raw));
        } catch {
          // Ignorar
        }
      }
    }

    // Si no hay conexión o no hay respuesta del servidor, no bloquear con error fatal:
    // devolver las incidencias pendientes locales o lista vacía para permitir registrar nuevas offline.
    const sinConexion =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      (isAxiosError(error) && (!error.response || error.code === "ERR_NETWORK"));

    if (sinConexion || cacheadas.length > 0 || pendientesLocales.length > 0) {
      return ordenarMasRecientes([...pendientesLocales, ...cacheadas]);
    }

    throw aServiceError(error);
  }
}

// POST /incidencias  (soporta offline proactivo y reactivo)
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

/* -------------------------------------------------------------------------- */
/* Mocks                                                                      */
/* -------------------------------------------------------------------------- */

const MOCK_DELAY_MS = 400;
const MOCK_USUARIO = "Carlos Mendoza";
const SIS_SIMULA_CAIDA = "999999999";

const delay = (ms = MOCK_DELAY_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const MOCK_EXAMENES: ExamenIncidencia[] = [
  { id: "1", nombre: "Cálculo II – Examen Final", fecha: "2026-09-06" },
  { id: "2", nombre: "Física I – Examen Parcial", fecha: "2026-09-07" },
  { id: "3", nombre: "Programación II – Examen Final", fecha: "2026-09-08" },
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
  codigoSis: string
): Incidencia {
  return {
    id,
    examenId,
    fechaHora,
    codigoSis,
    estudianteNombre: MOCK_ESTUDIANTES[codigoSis] ?? "Estudiante",
    motivo: "NO_HABILITADO",
    observaciones: null,
    registradoPor: MOCK_USUARIO,
  };
}

const mockIncidencias: Incidencia[] = [
  mockIncidencia("1", "1", "2026-09-06T09:03:44", "202104321"),
  mockIncidencia("2", "1", "2026-09-06T09:02:15", "202003456"),
  mockIncidencia("3", "1", "2026-09-06T09:00:52", "201905678"),
  mockIncidencia("4", "1", "2026-09-06T08:59:18", "202102345"),
  mockIncidencia("5", "3", "2026-09-08T10:15:30", "202002789"),
];

async function mockGetExamenes(): Promise<ExamenIncidencia[]> {
  await delay();
  return MOCK_EXAMENES.map((examen) => ({ ...examen }));
}

async function mockGetIncidencias(examenId: string): Promise<Incidencia[]> {
  await delay();
  return ordenarMasRecientes(
    mockIncidencias.filter((incidencia) => incidencia.examenId === examenId)
  );
}

async function mockCrearIncidencia(
  payload: CrearIncidenciaPayload
): Promise<Incidencia> {
  await delay();

  if (payload.codigoSis === SIS_SIMULA_CAIDA) {
    throw new IncidenciaServiceError("SIN_CONEXION");
  }
  if (!MOCK_EXAMENES.some((examen) => examen.id === payload.examenId)) {
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
