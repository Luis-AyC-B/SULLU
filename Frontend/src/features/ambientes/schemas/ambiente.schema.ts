import { z } from "zod";

export const EstadoAmbienteEnum = z.enum(["HABILITADO", "DISPONIBLE", "EN_REMODELACION", "INHABILITADO", "DESHABILITADO"]);
export type EstadoAmbiente = z.infer<typeof EstadoAmbienteEnum>;

export const AmbienteSchema = z.object({
  id: z.union([z.string(), z.number()]),
  nombre: z.string().min(1, "El nombre del ambiente es requerido"),
  capacidad: z.number().int().nonnegative().optional(),
  facultadId: z.union([z.string(), z.number()]).optional(),
  facultad: z.string().optional(),
  tipoAulaId: z.union([z.string(), z.number()]).optional(),
  tipoAula: z.string().optional(),
  estado: EstadoAmbienteEnum.default("HABILITADO"),
});

export type Ambiente = z.infer<typeof AmbienteSchema>;

export const PeriodoDisponibilidadSchema = z.object({
  id: z.union([z.string(), z.number()]),
  periodoNombre: z.string(),
  horaIni: z.string(),
  horaFin: z.string(),
  estado: z.enum(["LIBRE", "RESERVADO"]),
});

export type PeriodoDisponibilidad = z.infer<typeof PeriodoDisponibilidadSchema>;
