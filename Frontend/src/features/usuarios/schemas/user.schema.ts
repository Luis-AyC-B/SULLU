import { z } from "zod";

// ==========================================================
// Fragmentos reutilizables
// ==========================================================

const nombreSchema = z
  .string()
  .min(2, "Debe tener al menos 2 caracteres")
  .max(50, "Máximo 50 caracteres");

const telefonoSchema = z
  .string()
  .regex(/^[0-9]{7,8}$/, "Teléfono inválido")
  .optional()
  .or(z.literal(""));

// Ajustar el dominio institucional real del proyecto
const correoInstitucionalSchema = z
  .string()
  .email("Correo inválido")
  .refine(
    (val) =>
      val.endsWith("@universidad.edu") ||
      val.endsWith("@umss.edu") ||
      val.endsWith("@est.umss.edu"),
    {
      message: "Debe ser un correo institucional (@universidad.edu)",
    }
  );

const rolesIdsSchema = z
  .array(z.string())
  .min(1, "Selecciona al menos un rol");

// ==========================================================
// Schema: creación de usuario
// La contraseña temporal NO se valida acá: la genera el backend
// y se envía por correo (el form solo muestra un texto informativo)
// ==========================================================
export const createUserSchema = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  correo: correoInstitucionalSchema,
  telefono: telefonoSchema,
  rolesIds: rolesIdsSchema,
});

// ==========================================================
// Schema: edición de usuario
// ==========================================================
export const editUserSchema = z.object({
  id: z.number(),
  nombre: nombreSchema,
  apellido: nombreSchema,
  telefono: telefonoSchema,
  rolesIds: rolesIdsSchema,
});

// ==========================================================
// Schema: reactivación (correo ya existía pero estaba dado de baja)
// ==========================================================
export const reactivarUserSchema = z.object({
  correo: correoInstitucionalSchema,
  rolesIds: rolesIdsSchema,
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type EditUserFormValues = z.infer<typeof editUserSchema>;
export type ReactivarUserFormValues = z.infer<typeof reactivarUserSchema>;