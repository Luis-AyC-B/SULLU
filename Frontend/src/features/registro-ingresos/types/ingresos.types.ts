// src/features/registro-ingresos/types/ingresos.types.ts
import { z } from 'zod';

/* ---------- Ingreso ---------- */

export const metodoIngresoSchema = z.enum(['QR', 'Manual']);
export type MetodoIngreso = z.infer<typeof metodoIngresoSchema>;

export const estadoIngresoSchema = z.enum(['Habilitado', 'Inhabilitado']);
export type EstadoIngreso = z.infer<typeof estadoIngresoSchema>;

export const ingresoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  // ISO 8601 definido por el servidor. El cliente nunca la envía ni la modifica.
  hora: z.string().min(1),
  sis: z.string().min(1),
  estudiante: z.string().min(1),
  metodo: metodoIngresoSchema,
  estado: estadoIngresoSchema,
  casoExcepcional: z.string().nullish(),
});
export type Ingreso = z.infer<typeof ingresoSchema>;

/* ---------- Estudiante para búsqueda de casos excepcionales (HU-20) ---------- */

export interface EstudianteExamenItem {
  id: number | string;
  codSis: string;
  ci: string;
  nombre: string;
  apellido: string;
  estadoHabilitado: boolean;
  motivoInhabilitacion?: string | null;
  yaIngreso?: boolean;
  horaIngresoPrevio?: string;
  metodoIngresoPrevio?: MetodoIngreso;
}

export const registrarCasoExcepcionalSchema = z.object({
  examenId: z.union([z.string(), z.number()]),
  codigoSis: z.string().trim().min(1, 'Ingresa el código SIS'),
  motivo: z
    .string()
    .trim()
    .min(1, 'Ingresa el motivo del caso')
    .max(50, 'Máximo 50 caracteres'),
});
export type RegistrarCasoExcepcionalPayload = z.infer<
  typeof registrarCasoExcepcionalSchema
>;

/* ---------- Examen para el selector ---------- */

export const examenControlSchema = z.object({
  id: z.union([z.string(), z.number()]),
  nombre: z.string().min(1), // "Cálculo II – Examen Final"
  fecha: z.string().min(1), // yyyy-mm-dd
  estado: z.string().optional(), // "PROGRAMADO" | "EN_CURSO" | "FINALIZADO"
  ambiente: z.string().optional(), // "Laboratorio Informática 1"
  horario: z.string().optional(), // "08:15-09:45"
});
export type ExamenControl = z.infer<typeof examenControlSchema>;
export const examenesControlSchema = z.array(examenControlSchema);

/* ---------- Respuesta de ingresos por examen ---------- */

export const ingresosExamenSchema = z.object({
  examenId: z.union([z.string(), z.number()]),
  ingresados: z.number().int().nonnegative(), // 42
  total: z.number().int().nonnegative(), // 85
  // Ordenados del más reciente al más antiguo
  ingresos: z.array(ingresoSchema),
});
export type IngresosExamen = z.infer<typeof ingresosExamenSchema>;

/* ---------- Estado de la conexión en vivo ---------- */

export type EstadoConexion = 'conectado' | 'desconectado';

/* ---------- Helpers de presentación ---------- */

/** "2026-09-06T09:04:32-04:00" -> "09:04:32" o "09:15" si es HH:mm */
export function formatHoraIngreso(iso: string, soloHoraMinuto = false): string {
  if (!iso) return '--:--';
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('es-BO', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    ...(soloHoraMinuto ? {} : { second: '2-digit' }),
    timeZone: 'America/La_Paz',
  });
}

/** "2026-09-06" -> "06/09/2026" */
export function formatFechaExamen(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return y && m && d ? `${d}/${m}/${y}` : fecha;
}

/** "Cálculo II – Examen Final · 06/09/2026" */
export function labelExamen(e: ExamenControl): string {
  return `${e.nombre} · ${formatFechaExamen(e.fecha)}`;
}
