// src/features/roles/schemas/role.schema.ts
import { z } from "zod";

// Nombre: letras (con tildes/ñ), números, espacios, guion, punto, paréntesis
const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-.()]+$/;

// Descripción: mismo set + coma y dos puntos (texto más extenso)
const DESCRIPCION_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-.(),:]+$/;

export const rolSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del rol es obligatorio")
    .max(50, "El nombre no puede superar los 50 caracteres")
    .regex(NOMBRE_REGEX, "El nombre contiene caracteres no permitidos"),

  descripcion: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(1000, "La descripción no puede superar los 1000 caracteres")
    .regex(DESCRIPCION_REGEX, "La descripción contiene caracteres no permitidos"),

  plantillaBaseId: z.string().optional(), // id de la plantilla elegida en el selector

  permisos: z
    .array(z.string())
    .min(1, "Debes seleccionar al menos un permiso"),
});

export type RolFormValues = z.infer<typeof rolSchema>;

/**
 * El nombre duplicado (sin importar mayúsculas/minúsculas) no se puede validar
 * con un schema estático porque depende de la lista de roles ya existentes.
 * Por eso se arma como factory: el componente del formulario le pasa los
 * nombres actuales (excluyendo el propio, si está editando) al momento de usarlo.
 */
export function createRolSchema(nombresExistentes: string[]) {
  return rolSchema.superRefine((data, ctx) => {
    const nombreNormalizado = data.nombre.trim().toLowerCase();
    const yaExiste = nombresExistentes.some(
      (n) => n.trim().toLowerCase() === nombreNormalizado
    );

    if (yaExiste) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nombre"],
        message: "Ya existe un rol con este nombre",
      });
    }
  });
}