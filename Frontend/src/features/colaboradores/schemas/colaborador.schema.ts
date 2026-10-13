import { z } from "zod";

export const EstadoColaboradorEnum = z.enum([
  "APROBADO",
  "PENDIENTE",
  "RECHAZADO",
  "INACTIVO",
]);
export type EstadoColaborador = z.infer<typeof EstadoColaboradorEnum>;

export const SolicitudColaboradorSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo electrónico es requerido")
    .email("Ingresa un formato de correo electrónico válido")
    .refine(
      (val) => val.toLowerCase().endsWith("@umss.edu.bo") || val.toLowerCase().endsWith("@umss.edu"),
      "Debe ser un correo institucional (@umss.edu.bo)"
    ),
  nombres: z
    .string()
    .trim()
    .min(2, "Los nombres deben tener al menos 2 caracteres"),
  apellidos: z
    .string()
    .trim()
    .min(2, "Los apellidos deben tener al menos 2 caracteres"),
});

export type SolicitudColaboradorInput = z.infer<typeof SolicitudColaboradorSchema>;

export interface ExamenItem {
  id: string | number;
  materia: string; // Ej: "Cálculo I"
  parcial: string; // Ej: "Parcial 2"
  fecha: string; // Ej: "14 oct 2026"
  fechaIso: string; // Ej: "2026-10-14"
  periodo: string; // Ej: "Período 2"
  horario: string; // Ej: "08:15–09:45"
  ubicacion: string; // Ej: "Aula 204 · Bloque A"
  yaInicio?: boolean; // true si ya inició o está finalizado
  docenteEmail?: string;
}

export interface Colaborador {
  id: string | number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string; // "Ana Lucía Rojas"
  email: string;
  estado: EstadoColaborador;
  fechaSolicitud: string; // Ej: "10 oct 2026"
  examenesAsignadosIds: (string | number)[];
  docenteEmail: string; // Docente que lo solicitó
  docenteNombre: string; // Ej: "Luis Medina" o "Elena Paredes"
  aprobadoPor?: string; // "Admin" o "—"
  fechaRespuesta?: string; // "07 oct 2026" o "—"
  usuarioExiste: boolean; // true = "Usuario existente: se vinculará al docente", false = "Usuario nuevo: se creará la cuenta"
  rol: string; // "Personal de control"
}
