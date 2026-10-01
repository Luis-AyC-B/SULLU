import { z } from "zod";

export const examFormSchema = z.object({
  materiaId: z.string().min(1, { message: "Debe seleccionar una materia" }),
  tipoExamen: z.enum(
    ["Primer parcial", "Segundo parcial", "Examen final", "Segunda instancia"],
    { message: "Debe seleccionar un tipo de examen" }
  ),
  ambienteId: z.string().min(1, { message: "Debe seleccionar un ambiente reservado" }),
  normas: z
    .string()
    .max(500, { message: "Las normas no pueden exceder los 500 caracteres" })
    .optional(),
});

export type ExamFormValues = z.infer<typeof examFormSchema>;
