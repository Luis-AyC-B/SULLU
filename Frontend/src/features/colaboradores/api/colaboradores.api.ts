import { apiClient } from "@/shared/lib/api-client";
import { Colaborador, ExamenItem, SolicitudColaboradorInput } from "../schemas/colaborador.schema";

export interface ExamenDisponibleItem extends ExamenItem {
  tieneChoque: boolean;
  motivoChoque?: string;
}

interface SolicitudBackendResult {
  id: number | string;
  colaboradorId?: number | null;
  nombresSolicitados?: string;
  apellidosSolicitados?: string;
  correoSolicitado?: string;
  estadoSolicitud?: "APROBADO" | "PENDIENTE" | "RECHAZADO" | "INACTIVO";
}

function extractErrorMessage(error: unknown, defaultMsg: string): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data
  ) {
    const rawMsg = (error.response.data as { message: unknown }).message;
    if (Array.isArray(rawMsg)) return String(rawMsg[0]);
    if (typeof rawMsg === "string") return rawMsg;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMsg;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeColaborador(raw: Record<string, any>): Colaborador {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const formatDate = (val: unknown): string => {
    if (!val) return "—";
    if (typeof val === "string" && val.includes(" ")) return val; // ya formateado por backend
    const d = new Date(val as string);
    if (isNaN(d.getTime())) return "—";
    return `${String(d.getDate()).padStart(2, "0")} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  };

  const nombres: string = String(raw.nombres || raw.nombresSolicitados || "");
  const apellidos: string = String(raw.apellidos || raw.apellidosSolicitados || "");
  const nombreCompleto: string = raw.nombreCompleto || `${nombres} ${apellidos}`.trim();
  const email: string = String(raw.email || raw.correoSolicitado || "");
  const estado = (raw.estado || raw.estadoSolicitud || "PENDIENTE") as Colaborador["estado"];

  return {
    id: raw.id,
    colaboradorId: raw.colaboradorId ?? null,
    nombres,
    apellidos,
    nombreCompleto,
    email,
    estado,
    fechaSolicitud: formatDate(raw.fechaSolicitud),
    fechaRespuesta: raw.fechaRespuesta ? formatDate(raw.fechaRespuesta) : "—",
    examenesAsignadosIds: raw.examenesAsignadosIds || [],
    examenesAsignadosCount: raw.examenesAsignadosCount || 0,
    docenteId: raw.docenteId ?? null,
    docenteEmail: raw.docenteEmail || "",
    docenteNombre: raw.docenteNombre || "",
    aprobadoPor: raw.aprobadoPor ? String(raw.aprobadoPor) : "—",
    usuarioExiste: Boolean(raw.usuarioExiste ?? raw.colaboradorId),
    rol: raw.rol || "Personal de control",
  };
}

/**
 * HU13: Consulta nómina del docente autenticado o solicitudes pendientes de admin.
 */
export async function getColaboradores(params?: {
  docenteEmail?: string;
  isAdmin?: boolean;
}): Promise<Colaborador[]> {
  try {
    const url = params?.isAdmin ? "/colaboradores/solicitudes" : "/colaboradores/nomina";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<Record<string, any>[]>(url);
    const raw = Array.isArray(res.data) ? res.data : [];
    return raw.map(normalizeColaborador);
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al cargar la nómina de colaboradores"));
  }
}


/**
 * HU13: Envía una solicitud de vinculación de colaborador (Docente).
 */
export async function solicitarColaborador(
  input: SolicitudColaboradorInput,
  userEmail: string,
  userNombre?: string
): Promise<Colaborador> {
  const cleanEmail = input.email.trim().toLowerCase();
  const currentEmail = (userEmail || "").trim().toLowerCase();

  // Validación previa en cliente alineada con el criterio de aceptación
  if (cleanEmail === currentEmail) {
    throw new Error("No puedes agregarte a ti mismo como colaborador.");
  }

  try {
    const res = await apiClient.post<SolicitudBackendResult>("/colaboradores/solicitar", {
      email: cleanEmail,
      correo: cleanEmail,
      nombres: input.nombres.trim(),
      apellidos: input.apellidos.trim(),
    });

    const d = res.data;
    const hoy = new Date();
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const fechaStr = `${String(hoy.getDate()).padStart(2, "0")} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

    return {
      id: d.id,
      colaboradorId: d.colaboradorId,
      nombres: d.nombresSolicitados || input.nombres.trim(),
      apellidos: d.apellidosSolicitados || input.apellidos.trim(),
      nombreCompleto: `${d.nombresSolicitados || input.nombres.trim()} ${d.apellidosSolicitados || input.apellidos.trim()}`.trim(),
      email: d.correoSolicitado || cleanEmail,
      estado: d.estadoSolicitud || "PENDIENTE",
      fechaSolicitud: fechaStr,
      examenesAsignadosIds: [],
      docenteEmail: currentEmail,
      docenteNombre: userNombre || "Docente",
      aprobadoPor: "—",
      fechaRespuesta: "—",
      usuarioExiste: Boolean(d.colaboradorId),
      rol: "Personal de control",
    };
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al enviar la solicitud de colaborador"));
  }
}

/**
 * HU13: Da de baja a un colaborador de la nómina del docente.
 */
export async function darDeBajaColaborador(id: string | number): Promise<Colaborador> {
  try {
    const res = await apiClient.patch<Colaborador>(`/colaboradores/${id}/baja`);
    return res.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al dar de baja al colaborador"));
  }
}

/**
 * HU13: Aprueba una solicitud de colaborador (Administrador).
 */
export async function aprobarSolicitud(id: string | number): Promise<Colaborador> {
  try {
    const res = await apiClient.patch<Colaborador>(`/colaboradores/solicitudes/${id}/aprobar`);
    return res.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al aprobar la solicitud"));
  }
}

/**
 * HU13: Rechaza una solicitud de colaborador (Administrador).
 */
export async function rechazarSolicitud(id: string | number): Promise<Colaborador> {
  try {
    const res = await apiClient.patch<Colaborador>(`/colaboradores/solicitudes/${id}/rechazar`);
    return res.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al rechazar la solicitud"));
  }
}

/**
 * HU13: Obtiene los exámenes asignados y disponibles de un colaborador para el docente autenticado.
 */
export async function getExamenesColaborador(
  colaboradorId: string | number
): Promise<{
  colaborador: Colaborador;
  asignados: ExamenItem[];
  disponibles: ExamenDisponibleItem[];
}> {
  try {
    const res = await apiClient.get<{
      colaborador: Colaborador;
      asignados: ExamenItem[];
      disponibles: ExamenDisponibleItem[];
    }>(`/colaboradores/${colaboradorId}/examenes`);
    return res.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al cargar los exámenes del colaborador"));
  }
}

/**
 * HU13: Asigna un colaborador aprobado a un examen programado del docente.
 */
export async function asignarExamen(
  colaboradorId: string | number,
  examenId: string | number
): Promise<void> {
  try {
    await apiClient.post("/colaboradores/asignar-examen", {
      colaboradorId: Number(colaboradorId),
      examenId: Number(examenId),
    });
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al asignar examen al colaborador"));
  }
}

/**
 * HU13: Retira a un colaborador de un examen que aún no ha iniciado.
 */
export async function quitarExamen(
  colaboradorId: string | number,
  examenId: string | number
): Promise<void> {
  try {
    await apiClient.post("/colaboradores/desasignar-examen", {
      colaboradorId: Number(colaboradorId),
      examenId: Number(examenId),
    });
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error, "Error al retirar colaborador del examen"));
  }
}
