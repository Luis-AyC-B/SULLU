import { z } from "zod";

export const ReservaSchema = z.object({
  id: z.union([z.string(), z.number()]),
  ambienteId: z.union([z.string(), z.number()]),
  ambienteNombre: z.string(),
  facultad: z.string().optional(),
  fecha: z.string(),
  periodoNombre: z.string(),
  horaIni: z.string(),
  horaFin: z.string(),
  estado: z.string().default("RESERVADO"),
  examenAsociado: z.string().nullable().optional(),
  tieneExamenAsignado: z.boolean().default(false),
});

export type Reserva = z.infer<typeof ReservaSchema>;

export const CrearReservaSchema = z.object({
  ambienteId: z.union([z.string(), z.number()]),
  ambienteNombre: z.string().optional(),
  fecha: z.string(),
  horarioFijoId: z.union([z.string(), z.number()]),
  periodoNombre: z.string().optional(),
});

export type CrearReservaInput = z.infer<typeof CrearReservaSchema>;
