import { z } from "zod";
export const addEstudianteSchema = z.object({
    nombre: z
        .string()
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede exceder 100 caracteres"),
    apellido: z
        .string()
        .trim()
        .min(2, "El apellido debe tener al menos 2 caracteres")
        .max(100, "El apellido no puede exceder 100 caracteres"),
    cod_sis: z
        .string()
        .trim()
        .min(3, "El código SIS debe tener al menos 3 caracteres")
        .max(20, "El código SIS no puede exceder 20 caracteres")
        .regex(/^[a-zA-Z0-9_-]+$/, "El código solo puede contener letras, números y guiones"),
    ci: z
        .string()
        .trim()
        .max(20, "El CI no puede exceder 20 caracteres")
        .optional()
        .or(z.literal("")),
});
export type AddEstudianteFormValues = z.infer<typeof addEstudianteSchema>;
export const inhabilitarEstudianteSchema = z.object({
    motivo: z
        .string()
        .trim()
        .max(200, "El motivo no puede exceder 200 caracteres")
        .optional(),
});
export type InhabilitarEstudianteFormValues = z.infer<typeof inhabilitarEstudianteSchema>;
