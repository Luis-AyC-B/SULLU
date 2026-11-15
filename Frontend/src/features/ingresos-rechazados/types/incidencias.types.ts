import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Motivos (Criterio 14)                                                      */
/* -------------------------------------------------------------------------- */

export const MOTIVOS_INCIDENCIA = [
  "NO_HABILITADO",
  "DOBLE_MARCACION",
  "QR_OTRO_EXAMEN",
  "QR_NO_VALIDO",
  "QR_VENCIDO",
  "NO_ASISTIO",
] as const;

export type MotivoIncidencia = (typeof MOTIVOS_INCIDENCIA)[number];

export const MOTIVO_LABEL: Record<string, string> = {
  NO_HABILITADO: "No habilitado",
  DOBLE_MARCACION: "Doble marcación",
  QR_OTRO_EXAMEN: "QR de otro examen",
  QR_NO_VALIDO: "QR no válido",
  QR_VENCIDO: "QR de examen vencido",
  NO_ASISTIO: "No asistió",
};

export function getMotivoLabel(motivo: string): string {
  if (motivo in MOTIVO_LABEL) {
    return MOTIVO_LABEL[motivo];
  }
  return motivo
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export const MOTIVO_POR_DEFECTO: MotivoIncidencia = "NO_HABILITADO";

export const MOTIVO_OPCIONES = MOTIVOS_INCIDENCIA.map((value) => ({
  value,
  label: MOTIVO_LABEL[value] || value,
}));

// Opciones para el filtro en la barra de herramientas (con "Todos los motivos" al inicio)
// Criterio 14: No habilitado, Doble marcación, QR de otro examen, QR no válido, QR de examen vencido
export const MOTIVOS_FILTRO_OPCIONES = [
  { value: "TODOS", label: "Todos los motivos" },
  { value: "NO_HABILITADO", label: "No habilitado" },
  { value: "DOBLE_MARCACION", label: "Doble marcación" },
  { value: "QR_OTRO_EXAMEN", label: "QR de otro examen" },
  { value: "QR_NO_VALIDO", label: "QR no válido" },
  { value: "QR_VENCIDO", label: "QR de examen vencido" },
  { value: "NO_ASISTIO", label: "No asistió" },
];

/* -------------------------------------------------------------------------- */
/* Gestiones Académicas (Año en curso 2026 - Criterio 5)                     */
/* -------------------------------------------------------------------------- */

export type GestionAcademica = "Gestión 1/2026" | "Gestión 2/2026";

export const GESTIONES_DISPONIBLES: GestionAcademica[] = [
  "Gestión 1/2026",
  "Gestión 2/2026",
];

export function obtenerGestionPorFecha(fechaIso: string): GestionAcademica {
  if (!fechaIso) return "Gestión 2/2026";
  const match = /^(\d{4})-(\d{2})/.exec(fechaIso);
  if (match) {
    const mes = parseInt(match[2], 10);
    return mes <= 6 ? "Gestión 1/2026" : "Gestión 2/2026";
  }
  const d = new Date(fechaIso);
  if (!Number.isNaN(d.getTime())) {
    const mes = d.getMonth() + 1;
    return mes <= 6 ? "Gestión 1/2026" : "Gestión 2/2026";
  }
  return "Gestión 2/2026";
}

export function obtenerGestionVigente(): GestionAcademica {
  return "Gestión 2/2026";
}

/* -------------------------------------------------------------------------- */
/* Roles y Filtros HU-18 (Criterios 1, 2, 3, 4, 6)                            */
/* -------------------------------------------------------------------------- */

export type RolIncidencias = "docente" | "control" | "admin" | "custom";

export interface FiltrosIncidencias {
  facultadId: string; // Solo Admin: "TODAS" o id de facultad
  carreraId: string; // Solo Admin: "TODAS" o id de carrera
  docenteId: string; // Admin, Control y Custom: "TODOS" o id de docente
  gestion: GestionAcademica; // Todos los roles
  materiaId: string; // Todos los roles: "TODAS" o nombre de materia
  examenId: string; // Todos los roles: "TODOS" o id de examen
  motivo: string; // Todos los roles: "TODOS" o motivo
}

/* -------------------------------------------------------------------------- */
/* Respuestas del backend                                                     */
/* -------------------------------------------------------------------------- */

// Examen que aparece en el selector (listado y formulario) con datos de alcance
export const examenIncidenciaSchema = z.object({
  id: z.coerce.string(),
  nombre: z.string(),
  // "2026-09-06" o ISO completo; solo se usa la parte de la fecha.
  fecha: z.string(),
  facultad: z.string().optional(),
  facultadId: z.union([z.string(), z.number()]).optional(),
  carrera: z.string().optional(),
  carreraId: z.union([z.string(), z.number()]).optional(),
  materia: z.string().optional(),
  materiaId: z.union([z.string(), z.number()]).optional(),
  docente: z.string().optional(),
  docenteId: z.union([z.string(), z.number()]).optional(),
  gestion: z.string().optional(),
  ambiente: z.string().optional(),
  horario: z.string().optional(),
  estado: z.string().optional(),
});

export type ExamenIncidencia = z.infer<typeof examenIncidenciaSchema>;

export const examenesIncidenciaSchema = z.array(examenIncidenciaSchema);

// Incidencia ya registrada. La hora y el usuario los asigna el backend.
export const incidenciaSchema = z.object({
  id: z.coerce.string(),
  examenId: z.coerce.string(),
  // Fecha y hora ISO asignada por el servidor.
  fechaHora: z.string(),
  codigoSis: z.string(),
  estudianteNombre: z.string(),
  motivo: z.string(),
  observaciones: z.string().nullish(),
  registradoPor: z.string(),
});

export type Incidencia = z.infer<typeof incidenciaSchema>;

// GET /examenes/:id/incidencias -> arreglo ordenado de más reciente a más antigua.
export const incidenciasSchema = z.array(incidenciaSchema);

/* -------------------------------------------------------------------------- */
/* Formulario "Registrar incidencia"                                          */
/* -------------------------------------------------------------------------- */

export const OBSERVACIONES_MAX = 500;

export const crearIncidenciaFormSchema = z.object({
  codigoSis: z
    .string()
    .trim()
    .min(1, "Ingresa el código SIS")
    .regex(/^\d+$/, "El código SIS solo debe contener números")
    .max(15, "El código SIS es demasiado largo"),
  examenId: z.string().min(1, "Selecciona un examen"),
  motivo: z.string().min(1, "Selecciona un motivo"),
  observaciones: z
    .string()
    .trim()
    .max(OBSERVACIONES_MAX, `Máximo ${OBSERVACIONES_MAX} caracteres`),
});

export type CrearIncidenciaFormValues = z.infer<
  typeof crearIncidenciaFormSchema
>;

export const CREAR_INCIDENCIA_DEFAULTS: CrearIncidenciaFormValues = {
  codigoSis: "",
  examenId: "",
  motivo: MOTIVO_POR_DEFECTO,
  observaciones: "",
};

// Lo que viaja al backend. La hora y el usuario NUNCA se envían desde el
// cliente: los asigna el servidor a partir de la sesión.
export interface CrearIncidenciaPayload {
  codigoSis: string;
  examenId: string;
  motivo: string;
  observaciones?: string;
}

export function toCrearIncidenciaPayload(
  values: CrearIncidenciaFormValues
): CrearIncidenciaPayload {
  const observaciones = values.observaciones.trim();
  return {
    codigoSis: values.codigoSis.trim(),
    examenId: values.examenId,
    motivo: values.motivo,
    ...(observaciones ? { observaciones } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers de filtrado y presentación                                        */
/* -------------------------------------------------------------------------- */

export function filtrarIncidenciasPorMotivo(
  incidencias: Incidencia[],
  motivoFiltro: string
): Incidencia[] {
  if (!motivoFiltro || motivoFiltro === "TODOS") {
    return incidencias;
  }
  return incidencias.filter((item) => {
    if (item.motivo === motivoFiltro) return true;
    // Si viene "QR_NO_VALIDO" vs label o variaciones
    if (motivoFiltro === "QR_NO_VALIDO" && (item.motivo === "QR_NO_VALIDO" || item.motivo === "Codigo QR no valido")) return true;
    return false;
  });
}

// "2026-09-06" -> "06/09/2026"
export function formatFechaExamen(fecha: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!match) return fecha;
  const [, anio, mes, dia] = match;
  return `${dia}/${mes}/${anio}`;
}

// "Cálculo II – Examen Final · 06/09/2026"
export function labelExamen(examen: ExamenIncidencia): string {
  return `${examen.nombre} · ${formatFechaExamen(examen.fecha)}`;
}

// ISO -> "09:03:44"
export function formatHoraIncidencia(fechaHora: string): string {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return "--:--:--";
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

// Criterio 13: "N observaciones registradas" según los filtros aplicados
export function labelContadorIncidencias(total: number): string {
  return total === 1
    ? "1 observación registrada"
    : `${total} observaciones registradas`;
}
