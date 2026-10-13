import { isAxiosError } from "axios";
import { apiClient } from "@/shared/lib/api-client";
import {
  examenesIncidenciaSchema,
  incidenciaSchema,
  incidenciasSchema,
  type CrearIncidenciaPayload,
  type ExamenIncidencia,
  type Incidencia,
} from "../types/incidencias.types";

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

// El back responde los errores de negocio con { code: "SIS_NO_EXISTE" | ... }.
function leerCodigo(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const data: unknown = error.response?.data;
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

// 404 sin código de negocio = el endpoint aún no existe -> se usan mocks.
// OJO: un 404 por ruta mal escrita también cae aquí y queda enmascarado.
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
/* API                                                                        */
/* -------------------------------------------------------------------------- */

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

function ordenarMasRecientes(items: Incidencia[]): Incidencia[] {
  return [...items].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
  );
}

// GET /examenes/control
export async function getExamenesIncidencias(): Promise<ExamenIncidencia[]> {
  if (USE_MOCKS) return mockGetExamenes();
  try {
    const { data } = await apiClient.get("/examenes/control");
    return examenesIncidenciaSchema.parse(data);
  } catch (error) {
    if (esRutaInexistente(error)) return mockGetExamenes();
    throw aServiceError(error);
  }
}

// GET /examenes/:id/incidencias
export async function getIncidenciasExamen(
  examenId: string
): Promise<Incidencia[]> {
  if (USE_MOCKS) return mockGetIncidencias(examenId);
  try {
    const { data } = await apiClient.get(
      `/examenes/${encodeURIComponent(examenId)}/incidencias`
    );
    return ordenarMasRecientes(incidenciasSchema.parse(data));
  } catch (error) {
    if (esRutaInexistente(error)) return mockGetIncidencias(examenId);
    throw aServiceError(error);
  }
}

// POST /incidencias  (la hora y el usuario los asigna el servidor)
export async function crearIncidencia(
  payload: CrearIncidenciaPayload
): Promise<Incidencia> {
  if (USE_MOCKS) return mockCrearIncidencia(payload);
  try {
    const { data } = await apiClient.post("/incidencias", payload);
    return incidenciaSchema.parse(data);
  } catch (error) {
    if (esRutaInexistente(error)) return mockCrearIncidencia(payload);
    throw aServiceError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Mocks                                                                      */
/* -------------------------------------------------------------------------- */
// Los datos viven en memoria: al recargar la página vuelven al estado inicial.
// SIS 999999999 simula una caída de red al registrar.

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

// Examen 1: 4 incidencias · Examen 2: vacío · Examen 3: 1 incidencia.
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