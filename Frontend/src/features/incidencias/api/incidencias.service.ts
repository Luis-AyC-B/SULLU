import { isAxiosError } from "axios";
import { apiClient } from "@/shared/lib/api-client";
import { coincideBusqueda } from "../lib/filtrarIncidencias";
import {
  CASOS_INCIDENCIA,
  MOTIVOS_EXPULSION,
  examenesExpulsionSchema,
  incidenciaSchema,
  incidenciasSchema,
  type CasoIncidencia,
  type EstudianteExpulsable,
  type ExamenExpulsion,
  type Incidencia,
  type MotivoExpulsion,
  type PayloadRegistrarExpulsion,
} from "../types/incidencias.types";

export { incidenciaSchema, incidenciasSchema };

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

    const datos: unknown = error.response.data;
    const codigo =
      datos && typeof datos === "object" && "code" in datos
        ? (datos as { code: unknown }).code
        : undefined;

    // Primero el código del backend: "examen no en curso" también llega como 403
    if (codigo === "EXAMEN_NO_EN_CURSO") {
      return new ErrorServicioIncidencias("EXAMEN_NO_EN_CURSO");
    }
    if (codigo === "YA_EXPULSADO" || codigo === "ESTUDIANTE_YA_EXPULSADO") {
      return new ErrorServicioIncidencias("ESTUDIANTE_YA_EXPULSADO");
    }
    if (error.response.status === 403) {
      return new ErrorServicioIncidencias("SIN_PERMISO");
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

/* Motivos: mapeo entre etiquetas legibles del backend y códigos de frontend */

export const MOTIVO_A_ETIQUETA: Record<string, string> = {
  MATERIAL_NO_AUTORIZADO: "Material no autorizado",
  USO_CELULAR: "Uso de celular",
  COMUNICACION_ENTRE_ESTUDIANTES: "Comunicación entre estudiantes",
  SUPLANTACION_IDENTIDAD: "Suplantación de identidad",
  OTRO: "Otro",
};

export const ETIQUETA_A_MOTIVO: Record<string, string> = Object.fromEntries(
  Object.entries(MOTIVO_A_ETIQUETA).map(([codigo, etiqueta]) => [
    etiqueta,
    codigo,
  ]),
);

const MOTIVOS_LOWER: Record<string, MotivoExpulsion> = {
  "material no autorizado": "MATERIAL_NO_AUTORIZADO",
  "uso de celular": "USO_CELULAR",
  "comunicacion entre estudiantes": "COMUNICACION_ENTRE_ESTUDIANTES",
  "comunicación entre estudiantes": "COMUNICACION_ENTRE_ESTUDIANTES",
  "suplantacion de identidad": "SUPLANTACION_IDENTIDAD",
  "suplantación de identidad": "SUPLANTACION_IDENTIDAD",
  "otro": "OTRO",
};

/**
 * Normaliza una fila de incidencia proveniente del backend o de mocks.
 * Acepta campos nulos o ausentes y provee valores seguros por defecto.
 */
export function normalizarIncidencia(fila: unknown): Record<string, unknown> {
  if (!fila || typeof fila !== "object") {
    return {
      id: "",
      examenId: "",
      fechaHora: new Date().toISOString(),
      codigoSis: "",
      estudianteNombre: "",
      caso: "EXPULSION",
      motivo: "OTRO",
      detalle: "",
      registradoPor: "",
    };
  }

  const f = fila as Record<string, unknown>;

  // Normalizar motivo (admite null, undefined, etiquetas en español o claves enum)
  let motivo = f.motivo;
  if (typeof motivo === "string") {
    const lim = motivo.trim();
    motivo =
      ETIQUETA_A_MOTIVO[lim] ??
      MOTIVOS_LOWER[lim.toLowerCase()] ??
      (MOTIVOS_EXPULSION.includes(lim as MotivoExpulsion) ? lim : "OTRO");
  } else {
    motivo = "OTRO";
  }

  // Normalizar caso
  let caso = f.caso;
  if (
    typeof caso !== "string" ||
    !CASOS_INCIDENCIA.includes(caso as CasoIncidencia)
  ) {
    caso = "EXPULSION";
  }

  // Normalizar fecha y hora
  const fechaHora =
    (typeof f.fechaHora === "string" && f.fechaHora) ||
    (typeof f.fecha_hora === "string" && f.fecha_hora) ||
    (typeof f.createdAt === "string" && f.createdAt) ||
    (typeof f.created_at === "string" && f.created_at) ||
    new Date().toISOString();

  // Normalizar nombre de estudiante
  let estudianteNombre =
    f.estudianteNombre ?? f.nombreEstudiante ?? f.estudiante_nombre;
  if (!estudianteNombre && f.estudiante && typeof f.estudiante === "object") {
    const est = f.estudiante as Record<string, unknown>;
    estudianteNombre = [est.nombre, est.apellido].filter(Boolean).join(" ");
  }

  // Normalizar código SIS
  const codigoSis =
    f.codigoSis ??
    f.cod_sis ??
    f.codigo_sis ??
    (f.estudiante && typeof f.estudiante === "object"
      ? (f.estudiante as Record<string, unknown>).cod_sis
      : "") ??
    "";

  // Normalizar registrado por (docente / usuario)
  let registradoPor = f.registradoPor ?? f.docenteNombre ?? f.registrado_por;
  if (!registradoPor && f.docente && typeof f.docente === "object") {
    const doc = f.docente as Record<string, unknown>;
    registradoPor = [doc.nombre, doc.apellido].filter(Boolean).join(" ");
  }

  return {
    ...f,
    id: f.id != null ? String(f.id) : "",
    examenId: f.examenId != null ? String(f.examenId) : "",
    fechaHora: String(fechaHora),
    codigoSis: String(codigoSis ?? ""),
    estudianteNombre: String(estudianteNombre ?? ""),
    caso,
    motivo,
    detalle: f.detalle != null ? String(f.detalle) : "",
    registradoPor: String(registradoPor ?? ""),
  };
}

/**
 * Normaliza un objeto examen proveniente de /examenes o /expulsiones/examenes
 * soportando campos nulos o ausentes.
 */
export function normalizarExamen(raw: unknown): ExamenExpulsion {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      nombre: "Examen",
      ubicacion: null,
      enCurso: false,
    };
  }

  const e = raw as Record<string, unknown>;
  const id = String(e.id ?? e.examen_id ?? "");

  let nombre = typeof e.nombre === "string" && e.nombre ? e.nombre : "";
  if (!nombre) {
    const materia = e.materiaNombre ?? e.materia ?? `Examen #${id}`;
    const tipo = e.tipoExamen ?? e.tipo_examen ?? "";
    nombre = tipo ? `${materia} - ${tipo}` : String(materia);
  }

  const infoUbicacion = [
    e.ambienteNombre ?? e.ambiente,
    e.carreraNombre ?? e.carrera,
  ]
    .filter(Boolean)
    .join(" · ");

  const ubicacion =
    (typeof e.ubicacion === "string" ? e.ubicacion : null) ??
    (infoUbicacion || null);

  const enCurso =
    e.enCurso === true ||
    e.estado === "EN_CURSO" ||
    e.estadoExamId === 2;

  return {
    id,
    nombre,
    ubicacion,
    enCurso,
  };
}

function ordenarMasRecientes(incidencias: Incidencia[]): Incidencia[] {
  return [...incidencias].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
  );
}

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 1: Listar exámenes disponibles para el selector
 * --------------------------------------------------------------------------
 * Consume dinámicamente la API real de exámenes (GET /examenes o GET /expulsiones/examenes).
 */
export async function obtenerExamenes(): Promise<ExamenExpulsion[]> {
  try {
    let filas: unknown[] = [];
    try {
      const { data } = await apiClient.get("/examenes");
      filas = Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      const { data } = await apiClient.get("/expulsiones/examenes");
      filas = Array.isArray(data) ? data : (data?.data ?? []);
    }

    const adaptados = filas.map(normalizarExamen);
    const parseResult = examenesExpulsionSchema.safeParse(adaptados);
    if (!parseResult.success) {
      console.warn("Error de validación de Zod en exámenes:", parseResult.error);
      return adaptados;
    }
    return parseResult.data;
  } catch (error) {
    if (USAR_MOCKS_INCIDENCIAS) {
      console.warn(
        "No se pudo obtener exámenes de la API real, usando fallback mock:",
        error,
      );
      return mockObtenerExamenes();
    }
    throw aErrorServicio(error);
  }
}

export const examenesService = {
  obtenerExamenes,
};

export const obtenerExamenesExpulsion = obtenerExamenes;

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 2: Obtener incidencias registradas de un examen
 * --------------------------------------------------------------------------
 * Ruta principal: GET /examenes/:id/expulsiones
 * Ruta fallback: GET /expulsiones/examen/:id (si la primera da 404)
 * Si ambas devuelven 404 o el examen no tiene incidencias registradas, retorna []
 * evitando arrojar excepciones a useIncidenciasPorExamen para mantener la UI limpia.
 */
export async function obtenerIncidenciasPorExamen(
  examenId: string,
): Promise<Incidencia[]> {
  if (USAR_MOCKS_INCIDENCIAS) return mockObtenerIncidencias(examenId);
  try {
    let resData: unknown;

    try {
      const res = await apiClient.get(
        `/examenes/${encodeURIComponent(examenId)}/expulsiones`,
      );
      resData = res.data;
    } catch (errPrimeraRuta) {
      if (
        isAxiosError(errPrimeraRuta) &&
        errPrimeraRuta.response?.status === 404
      ) {
        try {
          const resFallback = await apiClient.get(
            `/expulsiones/examen/${encodeURIComponent(examenId)}`,
          );
          resData = resFallback.data;
        } catch (errSegundaRuta) {
          if (
            isAxiosError(errSegundaRuta) &&
            errSegundaRuta.response?.status === 404
          ) {
            return [];
          }
          throw errSegundaRuta;
        }
      } else {
        throw errPrimeraRuta;
      }
    }

    const dataObj = resData as Record<string, unknown> | null | undefined;
    const filas: unknown[] = Array.isArray(resData)
      ? resData
      : Array.isArray(dataObj?.data)
        ? (dataObj?.data as unknown[])
        : Array.isArray(dataObj?.incidencias)
          ? (dataObj?.incidencias as unknown[])
          : Array.isArray(dataObj?.expulsiones)
            ? (dataObj?.expulsiones as unknown[])
            : [];

    if (filas.length === 0) {
      return [];
    }

    const mapeadas = filas.map(normalizarIncidencia);
    const parseResult = incidenciasSchema.safeParse(mapeadas);

    if (!parseResult.success) {
      console.warn(
        "Error de validación de Zod en incidencias:",
        parseResult.error,
      );
      return ordenarMasRecientes(mapeadas as unknown as Incidencia[]);
    }

    return ordenarMasRecientes(parseResult.data);
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404 || status === 204) {
        return [];
      }
      const data = error.response?.data as Record<string, unknown> | undefined;
      const code = data && typeof data.code === "string" ? data.code : "";
      const message =
        data && typeof data.message === "string"
          ? data.message.toLowerCase()
          : "";
      if (
        code === "EXAMEN_INVALIDO" ||
        code === "SIN_INCIDENCIAS" ||
        code === "NOT_FOUND" ||
        message.includes("no existe") ||
        message.includes("no encontrado") ||
        message.includes("no tiene incidencias")
      ) {
        return [];
      }
    }
    console.warn("No se pudieron obtener las incidencias del examen, retornando lista vacía:", error);
    return [];
  }
}

function extraerArrayIngresos(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.ingresos)) return obj.ingresos;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.estudiantes)) return obj.estudiantes;
    if (Array.isArray(obj.items)) return obj.items;
    if (obj.data && typeof obj.data === "object") {
      const sub = obj.data as Record<string, unknown>;
      if (Array.isArray(sub.ingresos)) return sub.ingresos;
      if (Array.isArray(sub.data)) return sub.data;
      if (Array.isArray(sub.estudiantes)) return sub.estudiantes;
    }
  }
  return [];
}

/**
 * Consulta específicamente el endpoint de ingresos del examen actual:
 * GET /examenes/:id/ingresos
 */
export async function obtenerIngresosPorExamen(
  examenId: string | number,
): Promise<unknown[]> {
  if (
    examenId === undefined ||
    examenId === null ||
    String(examenId).trim() === "" ||
    String(examenId) === "undefined" ||
    String(examenId) === "null"
  ) {
    console.warn(
      "[obtenerIngresosPorExamen] examenId no es válido o está indefinido:",
      examenId,
    );
    return [];
  }

  const idStr = String(examenId).trim();
  const url = `/examenes/${encodeURIComponent(idStr)}/ingresos`;

  try {
    console.log("[obtenerIngresosPorExamen] Consultando endpoint:", url);
    const { data } = await apiClient.get(url);
    console.log(
      "[obtenerIngresosPorExamen] Respuesta exitosa de",
      url,
      ":",
      data,
    );

    const extraidos = extraerArrayIngresos(data);
    if (extraidos.length > 0) {
      return extraidos;
    }
    return [];
  } catch (error) {
    // Si la llamada directa falla o estamos en entorno offline/tests, intentar con getIngresosExamen
    try {
      const { getIngresosExamen } = await import(
        "@/features/registro-ingresos/api/ingresos.service"
      );
      const res = await getIngresosExamen(idStr);
      if (res && Array.isArray(res.ingresos) && res.ingresos.length > 0) {
        console.log(
          "[obtenerIngresosPorExamen] Recuperados desde getIngresosExamen (fallback):",
          res.ingresos,
        );
        return res.ingresos;
      }
    } catch {
      // Ignorar fallback
    }

    if (USAR_MOCKS_INCIDENCIAS && MOCK_INGRESADOS[idStr]) {
      return MOCK_INGRESADOS[idStr].map((m, idx) => ({
        id: idx + 1,
        sis: m.codigoSis,
        estudiante: m.nombre,
        estado: "Habilitado",
        hora: "09:00:00",
      }));
    }

    console.warn(
      `[obtenerIngresosPorExamen] No se pudieron obtener los ingresos de ${url}:`,
      error,
    );
    return [];
  }
}

/**
 * --------------------------------------------------------------------------
 * ENDPOINT 3: Búsqueda y filtrado de estudiantes para el modal de incidencia
 * --------------------------------------------------------------------------
 * 1. Origen de datos: Consulta el endpoint de ingresos del examen actual
 *    (/examenes/:id/ingresos a través de obtenerIngresosPorExamen).
 * 2. Filtro de estado:
 *    a) Ya registraron su ingreso (estado 'Habilitado' o 'Presente', o con fechaHora registrada).
 *    b) NO están expulsados previamente (excluir estado 'Expulsado' y aquellos con
 *       expulsión o suplantación registrada previamente en este examen).
 * 3. Coincidencia de búsqueda:
 *    Compara el texto ignorando mayúsculas/minúsculas y acentos tanto con codigoSis
 *    como con el nombre del estudiante.
 */
export async function buscarEstudiantesExpulsables(
  examenId: string,
  consulta = "",
): Promise<EstudianteExpulsable[]> {
  try {
    const [ingresosRaw, incidencias] = await Promise.all([
      obtenerIngresosPorExamen(examenId),
      obtenerIncidenciasPorExamen(examenId).catch(() => []),
    ]);

    // Conjunto de estudiantes expulsados previamente en este examen
    const codigosExpulsados = new Set(
      incidencias
        .filter(
          (inc) =>
            inc.caso === "EXPULSION" ||
            inc.caso === "SUPLANTACION_IDENTIDAD" ||
            !inc.caso,
        )
        .map((inc) => String(inc.codigoSis).trim().toLowerCase())
        .filter(Boolean),
    );

    const vistos = new Set<string>();
    const elegibles: EstudianteExpulsable[] = [];

    for (const item of ingresosRaw) {
      if (!item || typeof item !== "object") continue;

      const obj = item as Record<string, unknown>;

      let rawSis = "";
      if (obj.sis != null) rawSis = String(obj.sis);
      else if (obj.codigoSis != null) rawSis = String(obj.codigoSis);
      else if (obj.cod_sis != null) rawSis = String(obj.cod_sis);
      else if (obj.codigo_sis != null) rawSis = String(obj.codigo_sis);
      else if (obj.estudiante && typeof obj.estudiante === "object") {
        const est = obj.estudiante as Record<string, unknown>;
        rawSis = String(est.cod_sis ?? est.codigoSis ?? est.sis ?? "");
      }
      rawSis = rawSis.trim();

      let rawNombre = "";
      if (typeof obj.estudiante === "string") rawNombre = obj.estudiante;
      else if (obj.nombre != null) rawNombre = String(obj.nombre);
      else if (obj.estudianteNombre != null)
        rawNombre = String(obj.estudianteNombre);
      else if (obj.estudiante && typeof obj.estudiante === "object") {
        const est = obj.estudiante as Record<string, unknown>;
        rawNombre = [est.nombre, est.apellido].filter(Boolean).join(" ");
      }
      rawNombre = rawNombre.trim();

      if (!rawSis || !rawNombre) continue;

      const sisLower = rawSis.toLowerCase();
      if (vistos.has(sisLower)) continue;
      vistos.add(sisLower);

      let estadoRaw = "";
      if (obj.estado != null) estadoRaw = String(obj.estado);
      else if (obj.estadoIngreso != null) estadoRaw = String(obj.estadoIngreso);
      else if (obj.estado_ingreso != null)
        estadoRaw = String(obj.estado_ingreso);
      else if (obj.estado_habilitado === false) estadoRaw = "Inhabilitado";
      else if (obj.estado_habilitado === true) estadoRaw = "Habilitado";
      estadoRaw = estadoRaw.trim();

      const estadoNorm = estadoRaw.toLowerCase();

      // Regla 2.b: NO están expulsados previamente (excluir estado 'Expulsado')
      if (estadoNorm === "expulsado" || codigosExpulsados.has(sisLower)) {
        continue;
      }

      // Regla 2.a: ÚNICAMENTE los que ya registraron su ingreso
      // Descartar inhabilitados, ausentes o rechazados
      if (
        estadoNorm === "inhabilitado" ||
        estadoNorm === "ausente" ||
        estadoNorm === "rechazado"
      ) {
        continue;
      }

      const tieneHora = Boolean(obj.hora || obj.fechaHora || obj.fecha_hora);
      const esEstadoIngresoValido =
        estadoNorm === "habilitado" ||
        estadoNorm === "presente" ||
        estadoNorm === "ingresado" ||
        estadoNorm === "en aula" ||
        estadoNorm === "en_aula" ||
        estadoNorm === "" ||
        tieneHora;

      if (!esEstadoIngresoValido && !tieneHora) {
        continue;
      }

      let id: string | undefined = undefined;
      let estudianteId: string | undefined = undefined;

      if (obj.estudianteId != null) {
        estudianteId = String(obj.estudianteId);
      } else if (obj.estudiante_id != null) {
        estudianteId = String(obj.estudiante_id);
      } else if (obj.estudiante && typeof obj.estudiante === "object") {
        const est = obj.estudiante as Record<string, unknown>;
        if (est.id != null) estudianteId = String(est.id);
      }

      if (obj.id != null) {
        id = String(obj.id);
      } else if (estudianteId != null) {
        id = estudianteId;
      }

      if (!estudianteId && id) {
        estudianteId = id;
      }

      elegibles.push({
        id,
        estudianteId,
        codigoSis: rawSis,
        nombre: rawNombre,
      });
    }

    console.log(
      "[buscarEstudiantesExpulsables] examenId:",
      examenId,
      "ingresos recibidos:",
      ingresosRaw.length,
      "elegibles en aula:",
      elegibles.length,
      elegibles,
    );

    // Regla 3: Si hay término de búsqueda, comparar ignorando mayúsculas/minúsculas y acentos
    const q = consulta.trim();
    if (!q) {
      return elegibles;
    }

    return elegibles.filter((e) =>
      coincideBusqueda(e.nombre, e.codigoSis, q),
    );
  } catch (error) {
    console.warn("Error al buscar estudiantes expulsables en aula:", error);
    return [];
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
    const { data } = await apiClient.post("/expulsiones", {
      examenId: String(payload.examenId),
      codigoSis: String(payload.codigoSis),
      caso: payload.caso ?? "EXPULSION",
      motivo: payload.motivo,
      detalle: (payload.detalle ?? "").trim(),
    });
    return incidenciaSchema.parse(normalizarIncidencia(data));
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
