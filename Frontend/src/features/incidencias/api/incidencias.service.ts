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

/* ==========================================================================
   GUÍA PARA EL EQUIPO DE BACKEND / INTEGRACIÓN API
   ==========================================================================
   Para conectar el Backend real y apagar los mocks:
   1. En el archivo `.env.local` (o variables de entorno de producción):
      NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS=false
   2. El cliente HTTP `apiClient` ya inyecta automáticamente el token JWT
      de la sesión actual (`Authorization: Bearer <token>`).
   3. Implementar en el Backend los 4 endpoints descritos a continuación.
   ========================================================================== */

/* Errores de Negocio */

export type CodigoErrorIncidencia =
  | "EXAMEN_NO_EN_CURSO"
  | "ESTUDIANTE_YA_EXPULSADO"
  | "SIN_PERMISO"
  | "SIN_CONEXION"
  | "DESCONOCIDO";

const MENSAJES_ERROR: Record<CodigoErrorIncidencia, string> = {
  EXAMEN_NO_EN_CURSO: "Solo se puede registrar incidencias en un examen en curso.",
  ESTUDIANTE_YA_EXPULSADO: "El estudiante ya fue expulsado de este examen.",
  SIN_PERMISO: "No tienes permiso para registrar incidencias.",
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

/* ==========================================================================
   CONFIGURACIÓN DE MOCKS VS BACKEND REAL
   ==========================================================================
   Por defecto activo (true). Para desactivar y usar NestJS / PostgreSQL:
   Configurar NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS=false en tu .env.local
   ========================================================================== */
export const USAR_MOCKS_INCIDENCIAS =
  process.env.NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS !== "false";

function ordenarMasRecientes(incidencias: Incidencia[]): Incidencia[] {
  return [...incidencias].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
  );
}

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 1: Listar exámenes disponibles para el selector
 * --------------------------------------------------------------------------
 * BACKEND TO-DO:
 * Ruta: GET /expulsiones/examenes  (o GET /incidencias/examenes)
 * Retorna lista de exámenes visibles por el docente/controlador autenticado.
 * Respuesta esperada (Array):
 * [
 *   {
 *     "id": "1",               // string o número convertible
 *     "nombre": "Bases de Datos II – Primer parcial",
 *     "ubicacion": "Laboratorio 2", // string | null
 *     "enCurso": true          // boolean (determina si se habilita el botón de registrar)
 *   }
 * ]
 */
export async function obtenerExamenesExpulsion(): Promise<ExamenExpulsion[]> {
  if (USAR_MOCKS_INCIDENCIAS) return mockObtenerExamenes();
  try {
    const { data } = await apiClient.get("/expulsiones/examenes");
    return examenesExpulsionSchema.parse(data);
  } catch (error) {
    throw aErrorServicio(error);
  }
}

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 2: Obtener incidencias registradas de un examen
 * --------------------------------------------------------------------------
 * BACKEND TO-DO:
 * Ruta: GET /examenes/:id/expulsiones  (o GET /examenes/:id/incidencias)
 * Retorna las incidencias registradas durante el examen (ordenadas descendente por fecha/hora).
 * Respuesta esperada (Array):
 * [
 *   {
 *     "id": "1",
 *     "examenId": "1",
 *     "fechaHora": "2026-10-30T09:42:18.000Z", // Formato ISO-8601
 *     "codigoSis": "202001456",
 *     "estudianteNombre": "Diego Flores Vargas",
 *     "caso": "EXPULSION",                      // Enum: EXPULSION | SUPLANTACION_IDENTIDAD | AMONESTACION | PROBLEMA_MEDICO | RETIRO_VOLUNTARIO | INCIDENCIA_TECNICA | OTRO
 *     "motivo": "MATERIAL_NO_AUTORIZADO",        // Enum: MATERIAL_NO_AUTORIZADO | USO_CELULAR | COMUNICACION_ENTRE_ESTUDIANTES | SUPLANTACION_IDENTIDAD | OTRO
 *     "detalle": "Apuntes bajo el examen",       // string (puede ser "")
 *     "registradoPor": "Lic. Edgar Flores"       // Nombre del usuario que registró
 *   }
 * ]
 */
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

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 3: Búsqueda predictiva de estudiantes para el autocompletado
 * --------------------------------------------------------------------------
 * BACKEND TO-DO:
 * Ruta: GET /examenes/:id/expulsiones/estudiantes?q=termino
 * Busca únicamente estudiantes que:
 * 1) Estén inscritos en el examen y hayan marcado ingreso efectivo (están en aula).
 * 2) NO hayan sido expulsados ni inhabilitados previamente en este examen.
 * Respuesta esperada (Array máx 5-10 resultados):
 * [
 *   {
 *     "codigoSis": "201900123",
 *     "nombre": "Ana Rojas Mamani"
 *   }
 * ]
 */
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

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 4: Registrar una nueva incidencia en pleno examen
 * --------------------------------------------------------------------------
 * BACKEND TO-DO:
 * Ruta: POST /expulsiones  (o POST /incidencias)
 * Payload enviado por el frontend (JSON Body):
 * {
 *   "examenId": "1",
 *   "codigoSis": "202001456",
 *   "caso": "EXPULSION",                  // Enum obligatorio
 *   "motivo": "MATERIAL_NO_AUTORIZADO",    // Enum obligatorio
 *   "detalle": "Texto opcional"           // string opcional (máx 500 caracteres)
 * }
 * Reglas de negocio del backend:
 * - El docente/controlador autenticado (`registradoPor`) se extrae del JWT, NUNCA del body.
 * - La `fechaHora` la asigna el servidor.
 * - Si `caso === "EXPULSION"` o `"SUPLANTACION_IDENTIDAD"`, inhabilitar reingreso del alumno.
 * - Retornar 400 con { code: "EXAMEN_NO_EN_CURSO" } si el examen no está activo.
 * - Retornar 400 con { code: "ESTUDIANTE_YA_EXPULSADO" } si el alumno ya fue expulsado.
 * - Retornar 201 Created con el objeto `Incidencia` creado.
 */
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

/* ==========================================================================
   DATOS Y SIMULACIÓN MOCK (SE USAN MIENTRAS NEXT_PUBLIC_USAR_MOCKS_INCIDENCIAS!==false)
   ========================================================================== */

export const MOCK_DOCENTE = "Edgar";
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
    caso: "EXPULSION",
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
    caso: "AMONESTACION",
    motivo: "USO_CELULAR",
    detalle: "Primer aviso verbal por tener el celular sobre la mesa.",
    registradoPor: MOCK_DOCENTE,
  },
  {
    id: "3",
    examenId: "1",
    fechaHora: "2026-10-30T09:28:09",
    codigoSis: "201901567",
    estudianteNombre: "Gabriel Fernández Soto",
    caso: "EXPULSION",
    motivo: "COMUNICACION_ENTRE_ESTUDIANTES",
    detalle: "",
    registradoPor: MOCK_DOCENTE,
  },
  {
    id: "4",
    examenId: "1",
    fechaHora: "2026-10-30T09:15:22",
    codigoSis: "201900123",
    estudianteNombre: "Ana Rojas Mamani",
    caso: "PROBLEMA_MEDICO",
    motivo: "OTRO",
    detalle: "Descompensación de salud, trasladada a enfermería.",
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
      .filter(
        (i) =>
          i.examenId === examenId &&
          (i.caso === "EXPULSION" || i.caso === "SUPLANTACION_IDENTIDAD"),
      )
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
    (i) =>
      i.examenId === payload.examenId &&
      i.codigoSis === payload.codigoSis &&
      (i.caso === "EXPULSION" || i.caso === "SUPLANTACION_IDENTIDAD"),
  );
  if (
    (payload.caso === "EXPULSION" ||
      payload.caso === "SUPLANTACION_IDENTIDAD") &&
    yaExpulsado
  ) {
    throw new ErrorServicioIncidencias("ESTUDIANTE_YA_EXPULSADO");
  }

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
    caso: payload.caso,
    motivo: payload.motivo,
    detalle: (payload.detalle ?? "").trim(),
    registradoPor: MOCK_DOCENTE,
  };
  mockIncidencias.push(nueva);
  return { ...nueva };
}
