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
});
export type Ingreso = z.infer<typeof ingresoSchema>;

/* ---------- Examen para el selector ---------- */

export const examenControlSchema = z.object({
  id: z.union([z.string(), z.number()]),
  nombre: z.string().min(1), // "Cálculo II – Examen Final"
  fecha: z.string().min(1), // yyyy-mm-dd
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

/** "2026-09-06T09:04:32-04:00" -> "09:04:32" */
export function formatHoraIngreso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('es-BO', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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