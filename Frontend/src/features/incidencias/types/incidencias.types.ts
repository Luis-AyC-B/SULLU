import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Motivos                                                                    */
/* -------------------------------------------------------------------------- */

// Hoy solo existe "No habilitado". Para agregar más motivos basta con
// sumarlos aquí y en MOTIVO_LABEL (el formulario y el listado se adaptan).
export const MOTIVOS_INCIDENCIA = ["NO_HABILITADO"] as const;

export type MotivoIncidencia = (typeof MOTIVOS_INCIDENCIA)[number];

export const MOTIVO_LABEL: Record<MotivoIncidencia, string> = {
  NO_HABILITADO: "No habilitado",
};

export const MOTIVO_POR_DEFECTO: MotivoIncidencia = "NO_HABILITADO";

export const MOTIVO_OPCIONES = MOTIVOS_INCIDENCIA.map((value) => ({
  value,
  label: MOTIVO_LABEL[value],
}));

/* -------------------------------------------------------------------------- */
/* Respuestas del backend                                                     */
/* -------------------------------------------------------------------------- */

// Examen que aparece en el selector (listado y formulario).
export const examenIncidenciaSchema = z.object({
  id: z.coerce.string(),
  nombre: z.string(),
  // "2026-09-06" o ISO completo; solo se usa la parte de la fecha.
  fecha: z.string(),
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
  motivo: z.enum(MOTIVOS_INCIDENCIA),
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
  motivo: z.enum(MOTIVOS_INCIDENCIA, { error: "Selecciona un motivo" }),
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
  motivo: MotivoIncidencia;
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
/* Helpers de formato                                                         */
/* -------------------------------------------------------------------------- */

// "2026-09-06" -> "06/09/2026". Se corta el texto en vez de usar Date para
// evitar que la zona horaria (Bolivia, UTC-4) corra la fecha un día.
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

// ISO -> "09:03:44" (hora local del navegador).
export function formatHoraIncidencia(fechaHora: string): string {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return "--:--:--";
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

// "4 incidencias registradas para este examen"
export function labelContadorIncidencias(total: number): string {
  return total === 1
    ? "1 incidencia registrada para este examen"
    : `${total} incidencias registradas para este examen`;
}