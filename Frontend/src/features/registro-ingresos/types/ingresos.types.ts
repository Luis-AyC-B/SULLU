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

/* ---------- Gestiones (Año en curso 2026) ---------- */

export type GestionAcademica = 'Gestión 1/2026' | 'Gestión 2/2026';

export const GESTIONES_DISPONIBLES: GestionAcademica[] = [
  'Gestión 1/2026',
  'Gestión 2/2026',
];

/**
 * Criterio 5:
 * Si la fecha del examen está entre enero y junio (meses 1 a 6) -> "Gestión 1/2026".
 * Si está entre julio y diciembre (meses 7 a 12) -> "Gestión 2/2026".
 */
export function obtenerGestionPorFecha(fechaIso: string): GestionAcademica {
  if (!fechaIso) return 'Gestión 2/2026';
  const match = /^(\d{4})-(\d{2})/.exec(fechaIso);
  if (match) {
    const mes = parseInt(match[2], 10);
    return mes <= 6 ? 'Gestión 1/2026' : 'Gestión 2/2026';
  }
  const d = new Date(fechaIso);
  if (!Number.isNaN(d.getTime())) {
    const mes = d.getMonth() + 1;
    return mes <= 6 ? 'Gestión 1/2026' : 'Gestión 2/2026';
  }
  return 'Gestión 2/2026';
}

/**
 * Por defecto, la gestión vigente del año 2026.
 */
export function obtenerGestionVigente(): GestionAcademica {
  return 'Gestión 2/2026';
}

/* ---------- Examen para el selector y filtros combinables ---------- */

export const examenControlSchema = z.object({
  id: z.union([z.string(), z.number()]),
  nombre: z.string().min(1), // "Bases de Datos I – Primer parcial"
  fecha: z.string().min(1), // yyyy-mm-dd
  facultad: z.string().optional(),
  facultadId: z.union([z.string(), z.number()]).optional(),
  carrera: z.string().optional(),
  materia: z.string().optional(),
  materiaId: z.union([z.string(), z.number()]).optional(),
  docente: z.string().optional(),
  docenteId: z.union([z.string(), z.number()]).optional(),
  gestion: z.string().optional(),
  ambiente: z.string().optional(),
  horario: z.string().optional(),
  estado: z.string().optional(),
});
export type ExamenControl = z.infer<typeof examenControlSchema>;
export const examenesControlSchema = z.array(examenControlSchema);

/* ---------- Filtros combinables para HU-17 ---------- */

export interface FiltrosIngresos {
  facultadId: string; // Solo Admin: "TODAS" o id de facultad
  docenteId: string; // Admin y Control: "TODOS" o id de docente
  gestion: GestionAcademica; // Todos los roles: "Gestión 1/2026" o "Gestión 2/2026"
  materiaId: string; // Todos los roles: "TODAS" o id de materia
  examenId: string; // Todos los roles: "TODOS" o id de examen
}

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
