import { z } from 'zod';

/* ---------- Exámenes habilitados ---------- */

export const estadoExamenSchema = z.enum(['Habilitado', 'Inhabilitado']);
export type EstadoExamen = z.infer<typeof estadoExamenSchema>;

export const examenEstudianteSchema = z.object({
  id: z.union([z.string(), z.number()]),
  carrera: z.string(),
  nombre: z.string(),
  ambiente: z.string(),
  facultad: z.string(),
  /** ISO yyyy-mm-dd */
  fecha: z.string(),
  /** HH:mm */
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: estadoExamenSchema,
});

export type ExamenEstudiante = z.infer<typeof examenEstudianteSchema>;

export const examenesEstudianteSchema = z.array(examenEstudianteSchema);

/* ---------- QR personal ---------- */

/**
 * `token` es opaco: el backend lo firma y lo valida al escanear.
 * El CI se muestra en pantalla pero NO viaja en texto plano dentro del QR.
 */
export const studentQrPayloadSchema = z.object({
  nombre: z.string(),
  sis: z.string(),
  ci: z.string(),
  token: z.string(),
});

export type StudentQrPayload = z.infer<typeof studentQrPayloadSchema>;

/* ---------- Mocks ---------- */

/** Prefijo del accessToken que emite el fallback de desarrollo (sin backend). */
export const MOCK_TOKEN_PREFIX = 'mock-jwt-token-estudiante';