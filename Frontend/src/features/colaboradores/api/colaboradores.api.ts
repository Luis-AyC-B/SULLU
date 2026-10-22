import { apiClient } from "@/shared/lib/api-client";
import {
  Colaborador,
  ExamenItem,
  SolicitudColaboradorInput,
  EstudianteRegistrado,
} from "../schemas/colaborador.schema";

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETADO — búsqueda de estudiantes por código SIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Búsqueda predictiva de estudiantes registrados por código SIS parcial o completo.
 * GET /colaboradores/buscar?codSis=<query>
 */
export async function buscarEstudiantesPorCodSis(
  codSisQuery: string
): Promise<EstudianteRegistrado[]> {
  const q = codSisQuery.trim();
  if (!q) return [];
  const { data } = await apiClient.get<EstudianteRegistrado[]>(
    "/colaboradores/buscar",
    { params: { codSis: q } }
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// NÓMINA DEL DOCENTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener nómina de colaboradores del docente autenticado.
 * GET /colaboradores/nomina
 */
export async function getColaboradores(): Promise<Colaborador[]> {
  const { data } = await apiClient.get<Colaborador[]>("/colaboradores/nomina");
  return data;
}

/**
 * Enviar solicitud de colaborador por código SIS.
 * POST /colaboradores/solicitar
 */
export async function solicitarColaborador(
  input: SolicitudColaboradorInput
): Promise<Colaborador> {
  const { data } = await apiClient.post<Colaborador>(
    "/colaboradores/solicitar",
    { codSis: input.codSis }
  );
  return data;
}

/**
 * Dar de baja a un colaborador de la nómina (pasa a INACTIVO).
 * PATCH /colaboradores/:id/baja
 */
export async function darDeBajaColaborador(
  id: string | number
): Promise<Colaborador> {
  const { data } = await apiClient.patch<Colaborador>(
    `/colaboradores/${id}/baja`
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener solicitudes PENDIENTES para el panel del administrador.
 * GET /colaboradores/solicitudes
 */
export async function getSolicitudesPendientesAdmin(): Promise<Colaborador[]> {
  const { data } = await apiClient.get<Colaborador[]>(
    "/colaboradores/solicitudes"
  );
  return data;
}

/**
 * Obtener TODOS los registros de colaboradores (todos los estados).
 * GET /colaboradores/todos
 */
export async function getTodosAdmin(): Promise<Colaborador[]> {
  const { data } = await apiClient.get<Colaborador[]>("/colaboradores/todos");
  return data;
}

/**
 * Aprobar una solicitud pendiente.
 * El estudiante recibe el rol "Personal de control" además de su rol Estudiante.
 * PATCH /colaboradores/solicitudes/:id/aprobar
 */
export async function aprobarSolicitud(
  id: string | number
): Promise<Colaborador> {
  const { data } = await apiClient.patch<Colaborador>(
    `/colaboradores/solicitudes/${id}/aprobar`
  );
  return data;
}

/**
 * Rechazar una solicitud pendiente.
 * El estudiante conserva únicamente su rol Estudiante.
 * PATCH /colaboradores/solicitudes/:id/rechazar
 */
export async function rechazarSolicitud(
  id: string | number
): Promise<Colaborador> {
  const { data } = await apiClient.patch<Colaborador>(
    `/colaboradores/solicitudes/${id}/rechazar`
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE EXÁMENES
// ─────────────────────────────────────────────────────────────────────────────

export interface ExamenDisponibleItem extends ExamenItem {
  tieneChoque: boolean;
  motivoChoque?: string;
}

/**
 * Obtener exámenes asignados y disponibles de un colaborador.
 * GET /colaboradores/:colaboradorId/examenes
 */
export async function getExamenesColaborador(
  colaboradorId: string | number
): Promise<{
  colaborador: Colaborador;
  asignados: ExamenItem[];
  disponibles: ExamenDisponibleItem[];
}> {
  const { data } = await apiClient.get(
    `/colaboradores/${colaboradorId}/examenes`
  );
  return data;
}

/**
 * Asignar un colaborador a un examen programado.
 * POST /colaboradores/asignar-examen
 */
export async function asignarExamen(
  colaboradorId: string | number,
  examenId: string | number
): Promise<void> {
  await apiClient.post("/colaboradores/asignar-examen", {
    colaboradorId: Number(colaboradorId),
    examenId: Number(examenId),
  });
}

/**
 * Retirar un colaborador de un examen (solo si no ha iniciado).
 * POST /colaboradores/desasignar-examen
 */
export async function quitarExamen(
  colaboradorId: string | number,
  examenId: string | number
): Promise<void> {
  await apiClient.post("/colaboradores/desasignar-examen", {
    colaboradorId: Number(colaboradorId),
    examenId: Number(examenId),
  });
}
