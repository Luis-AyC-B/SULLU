import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo o usuario institucional es obligatorio')
    .refine((val: string) => {
      if (val.includes('@')) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      }
      return val.length >= 3;
    }, {
      message: 'Ingresa un correo institucional válido o tu código de usuario',
    }),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export const recoverySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo institucional es obligatorio')
    .email('Ingresa un correo institucional válido con formato usuario@...'),
});

export type RecoveryFormValues = z.infer<typeof recoverySchema>;