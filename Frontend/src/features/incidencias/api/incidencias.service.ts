import { isAxiosError } from "axios";
import { apiClient } from "@/shared/lib/api-client";
import { coincideBusqueda } from "../lib/filtrarIncidencias";
import {
  estudiantesExpulsablesSchema,
  examenesExpulsionSchema,
  incidenciaSchema,
  incidenciasSchema,
  type EstudianteExpulsable,
  type ExamenExpulsion,
  type Incidencia,
  type PayloadRegistrarExpulsion,
} from "../types/incidencias.types";

/* Errores */

export type CodigoErrorIncidencia =
  | "EXAMEN_NO_EN_CURSO"
  | "ESTUDIANTE_YA_EXPULSADO"
  | "SIN_PERMISO"
  | "SIN_CONEXION"
  | "DESCONOCIDO";

const MENSAJES_ERROR: Record<CodigoErrorIncidencia, string> = {
  EXAMEN_NO_EN_CURSO: "Solo se puede expulsar en un examen en curso.",
  ESTUDIANTE_YA_EXPULSADO: "El estudiante ya fue expulsado de este examen.",
  SIN_PERMISO: "No tienes permiso para registrar expulsiones.",
  SIN_CONEXION:
    "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
  DESCONOCIDO: "Ocurrió un error inesperado. Intenta de nuevo.",
};

export class ErrorServicioIncidencias extends Error {
  readonly codigo: CodigoErrorIncidencia;
  constructor(codigo: CodigoErrorIncidencia) {
    super(MENSAJES_ERROR[codigo]);
    this.name = "ErrorServicioIncidencias";
    this.codigo = codigo;
  }
}

function aErrorServicio(error: unknown): ErrorServicioIncidencias {
  if (error instanceof ErrorServicioIncidencias) return error;
  if (isAxiosError(error)) {
    if (!error.response) return new ErrorServicioIncidencias("SIN_CONEXION");
    if (error.response.status === 403) {
      return new ErrorServicioIncidencias("SIN_PERMISO");
    }
    const datos: unknown = error.response.data;
    const codigo =
      datos && typeof datos === "object" && "code" in datos
        ? (datos as { code: unknown }).code
        : undefined;
    if (
      codigo === "EXAMEN_NO_EN_CURSO" ||
      codigo === "ESTUDIANTE_YA_EXPULSADO"
    ) {
      return new ErrorServicioIncidencias(codigo);
    }
  }
  return new ErrorServicioIncidencias("DESCONOCIDO");
}

/* API (mock por defecto; NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS=false para usar el back) */

export const USAR_MOCKS_INCIDENCIAS =
  process.env.NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS !== "false";

function ordenarMasRecientes(incidencias: Incidencia[]): Incidencia[] {
  return [...incidencias].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
  );
}

// GET /expulsiones/examenes
export async function obtenerExamenesExpulsion(): Promise<ExamenExpulsion[]> {
  if (USAR_MOCKS_INCIDENCIAS) return mockObtenerExamenes();
  try {
    const { data } = await apiClient.get("/expulsiones/examenes");
    return examenesExpulsionSchema.parse(data);
  } catch (error) {
    throw aErrorServicio(error);
  }
}

// GET /examenes/:id/expulsiones  (más reciente primero)
export async function obtenerIncidenciasPorExamen(
  examenId: string,
): Promise<Incidencia[]> {
  if (USAR_MOCKS_INCIDENCIAS) return mockObtenerIncidencias(examenId);
  try {
    const { data } = await apiClient.get(
      `/examenes/${encodeURIComponent(examenId)}/expulsiones`,
    );
    return ordenarMasRecientes(incidenciasSchema.parse(data));
  } catch (error) {
    throw aErrorServicio(error);
  }
}

// GET /examenes/:id/expulsiones/estudiantes?q=
// Solo estudiantes que ya ingresaron y no están expulsados.
export async function buscarEstudiantesExpulsables(
  examenId: string,
  consulta: string,
): Promise<EstudianteExpulsable[]> {
  if (USAR_MOCKS_INCIDENCIAS) return mockBuscarEstudiantes(examenId, consulta);
  try {
    const { data } = await apiClient.get(
      `/examenes/${encodeURIComponent(examenId)}/expulsiones/estudiantes`,
      { params: { q: consulta } },
    );
    return estudiantesExpulsablesSchema.parse(data);
  } catch (error) {
    throw aErrorServicio(error);
  }
}

// POST /expulsiones
export async function registrarExpulsion(
  payload: PayloadRegistrarExpulsion,
): Promise<Incidencia> {
  if (USAR_MOCKS_INCIDENCIAS) return mockRegistrarExpulsion(payload);
  try {
    const { data } = await apiClient.post("/expulsiones", payload);
    return incidenciaSchema.parse(data);
  } catch (error) {
    throw aErrorServicio(error);
  }
}

/* Mocks */

const MOCK_DOCENTE = "Edgar";
const esperar = (ms = 350) =>
  new Promise<void>((resolver) => setTimeout(resolver, ms));

const MOCK_EXAMENES: ExamenExpulsion[] = [
  {
    id: "1",
    nombre: "Bases de Datos II – Primer parcial",
    ubicacion: "Laboratorio Informática 2 (FCyT) · Ingeniería de Sistemas",
    enCurso: true,
  },
  {
    id: "2",
    nombre: "Redes de Computadoras – Examen final",
    ubicacion: "Aula 305 (FCyT) · Ingeniería de Sistemas",
    enCurso: true,
  },
  {
    id: "3",
    nombre: "Programación II – Examen final",
    ubicacion: null,
    enCurso: false,
  },
];

// Estudiantes que ya ingresaron a cada examen.
const MOCK_INGRESADOS: Record<string, EstudianteExpulsable[]> = {
  "1": [
    { codigoSis: "201900123", nombre: "Ana Rojas Mamani" },
    { codigoSis: "202103678", nombre: "Mateo Pérez Arce" },
    { codigoSis: "202002789", nombre: "Lucía Salazar Ríos" },
    { codigoSis: "202001456", nombre: "Diego Flores Vargas" },
    { codigoSis: "201902345", nombre: "Valeria López Quispe" },
    { codigoSis: "201901567", nombre: "Gabriel Fernández Soto" },
  ],
  "2": [
    { codigoSis: "202104321", nombre: "Sofía Aguilar Céspedes" },
    { codigoSis: "202003456", nombre: "Andrés Villarroel Rocha" },
    { codigoSis: "201905678", nombre: "Camila Méndez García" },
  ],
  "3": [],
};

const mockIncidencias: Incidencia[] = [
  {
    id: "1",
    examenId: "1",
    fechaHora: "2026-10-30T09:42:18",
    codigoSis: "202001456",
    estudianteNombre: "Diego Flores Vargas",
    motivo: "MATERIAL_NO_AUTORIZADO",
    detalle: "Apuntes debajo del examen.",
    registradoPor: MOCK_DOCENTE,
  },
  {
    id: "2",
    examenId: "1",
    fechaHora: "2026-10-30T09:35:46",
    codigoSis: "201902345",
    estudianteNombre: "Valeria López Quispe",
    motivo: "USO_CELULAR",
    detalle: "Consulta de mensajes en celular.",
    registradoPor: MOCK_DOCENTE,
  },
  {
    id: "3",
    examenId: "1",
    fechaHora: "2026-10-30T09:28:09",
    codigoSis: "201901567",
    estudianteNombre: "Gabriel Fernández Soto",
    motivo: "COMUNICACION_ENTRE_ESTUDIANTES",
    detalle: "Intercambio de respuestas.",
    registradoPor: MOCK_DOCENTE,
  },
];

async function mockObtenerExamenes(): Promise<ExamenExpulsion[]> {
  await esperar();
  return MOCK_EXAMENES.map((e) => ({ ...e }));
}

async function mockObtenerIncidencias(examenId: string): Promise<Incidencia[]> {
  await esperar();
  return ordenarMasRecientes(
    mockIncidencias.filter((i) => i.examenId === examenId),
  );
}

async function mockBuscarEstudiantes(
  examenId: string,
  consulta: string,
): Promise<EstudianteExpulsable[]> {
  await esperar(200);
  const expulsados = new Set(
    mockIncidencias
      .filter((i) => i.examenId === examenId)
      .map((i) => i.codigoSis),
  );
  return (MOCK_INGRESADOS[examenId] ?? [])
    .filter((e) => !expulsados.has(e.codigoSis))
    .filter((e) => coincideBusqueda(e.nombre, e.codigoSis, consulta))
    .slice(0, 5);
}

async function mockRegistrarExpulsion(
  payload: PayloadRegistrarExpulsion,
): Promise<Incidencia> {
  await esperar();
  const examen = MOCK_EXAMENES.find((e) => e.id === payload.examenId);
  if (!examen || !examen.enCurso) {
    throw new ErrorServicioIncidencias("EXAMEN_NO_EN_CURSO");
  }
  const yaExpulsado = mockIncidencias.some(
    (i) => i.examenId === payload.examenId && i.codigoSis === payload.codigoSis,
  );
  if (yaExpulsado) throw new ErrorServicioIncidencias("ESTUDIANTE_YA_EXPULSADO");

  const estudiante = (MOCK_INGRESADOS[payload.examenId] ?? []).find(
    (e) => e.codigoSis === payload.codigoSis,
  );
  if (!estudiante) throw new ErrorServicioIncidencias("DESCONOCIDO");

  const nueva: Incidencia = {
    id: `mock-${Date.now()}`,
    examenId: payload.examenId,
    fechaHora: new Date().toISOString(),
    codigoSis: payload.codigoSis,
    estudianteNombre: estudiante.nombre,
    motivo: payload.motivo,
    detalle: payload.detalle,
    registradoPor: MOCK_DOCENTE,
  };
  mockIncidencias.push(nueva);
  return { ...nueva };
}