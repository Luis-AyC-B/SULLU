import { z } from 'zod';

/* ---------- Login (SIS + CI) ---------- */

export const studentLoginSchema = z.object({
  sis: z
    .string()
    .trim()
    .min(1, 'El código SIS es obligatorio')
    .regex(/^\d+$/, 'El código SIS solo debe contener números')
    .max(20),
  ci: z.string().trim().min(1, 'El CI es obligatorio').max(20),
});

export type StudentLoginValues = z.infer<typeof studentLoginSchema>;

export type StudentAuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'SERVER_ERROR';

/** Respuesta esperada de POST /auth/estudiante/login */
export const studentLoginResponseSchema = z.object({
  access_token: z.string(),
  estudiante: z.object({
    id: z.union([z.string(), z.number()]),
    nombre: z.string(),
  }),
});

export type StudentLoginResponse = z.infer<typeof studentLoginResponseSchema>;

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
export const MOCK_TOKEN_PREFIX = 'mock-jwt-student';