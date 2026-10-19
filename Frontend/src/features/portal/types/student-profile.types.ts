import { z } from 'zod';

/* ---------- Reglas de la fotografía ---------- */

export const FOTO_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png'] as const;
/** 2 MB. Confirmar el límite real con Back. */
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

/** Devuelve un mensaje de error, o null si la foto es válida. */
export function validarFoto(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(FOTO_TIPOS_PERMITIDOS as readonly string[]).includes(file.type)) {
    return 'La fotografía debe ser JPG o PNG.';
  }
  if (file.size > FOTO_MAX_BYTES) {
    return 'La fotografía no debe superar los 2 MB.';
  }
  return null;
}

/* ---------- Perfil del estudiante ---------- */

export const perfilEstudianteSchema = z.object({
  nombre: z.string(),
  sis: z.string(),
  ci: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  /** URL de la fotografía vigente, o null si todavía no subió una. */
  fotoUrl: z.string().nullable().optional(),
  /** false mientras no complete el primer ingreso (foto, datos extra y contraseña). */
  perfilCompleto: z.boolean(),
});
export type PerfilEstudiante = z.infer<typeof perfilEstudianteSchema>;

/* ---------- Datos extra (formulario) ---------- */

export const datosPerfilSchema = z.object({
  ci: z
    .string()
    .trim()
    .min(1, 'El carnet de identidad es obligatorio')
    .regex(/^\d{5,10}$/, 'El CI debe tener entre 5 y 10 números'),
  telefono: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^[67]\d{7}$/, 'Ingresa un celular de 8 dígitos que empiece con 6 o 7'),
});
export type DatosPerfilValues = z.infer<typeof datosPerfilSchema>;

/* ---------- Cambio de contraseña (formulario) ---------- */

export const PASSWORD_MIN = 8;
/** Coincide con el contador 0/12 del login. Confirmar la regla real con Back. */
export const PASSWORD_MAX = 12;

export const cambioPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Ingresa tu contraseña actual'),
    passwordNueva: z
      .string()
      .min(PASSWORD_MIN, `Debe tener al menos ${PASSWORD_MIN} caracteres`)
      .max(PASSWORD_MAX, `No debe superar los ${PASSWORD_MAX} caracteres`)
      .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
      .regex(/\d/, 'Debe incluir al menos un número'),
    confirmar: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((v) => v.passwordNueva === v.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })
  .refine((v) => v.passwordNueva !== v.passwordActual, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['passwordNueva'],
  });
export type CambioPasswordValues = z.infer<typeof cambioPasswordSchema>;

/* ---------- Respuestas del back ---------- */

export const subirFotoResponseSchema = z.object({ fotoUrl: z.string() });
export type SubirFotoResponse = z.infer<typeof subirFotoResponseSchema>;

/** Errores que el front distingue en el perfil. */
export type PerfilErrorCode =
  | 'PASSWORD_ACTUAL_INCORRECTA'
  | 'FOTO_INVALIDA'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR';