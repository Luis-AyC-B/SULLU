import { z } from "zod";

export const EstadoColaboradorEnum = z.enum([
  "APROBADO",
  "PENDIENTE",
  "RECHAZADO",
  "INACTIVO",
]);
export type EstadoColaborador = z.infer<typeof EstadoColaboradorEnum>;

export const SolicitudColaboradorSchema = z.object({
  codSis: z
    .string()
    .trim()
    .min(1, "Debes seleccionar un código SIS de la lista de estudiantes registrados"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del estudiante es requerido"),
  apellido: z
    .string()
    .trim()
    .min(1, "El apellido del estudiante es requerido"),
  email: z.string().trim().optional(),
  estudianteId: z.union([z.string(), z.number()]).optional(),
});

export type SolicitudColaboradorInput = z.infer<typeof SolicitudColaboradorSchema>;

export interface EstudianteRegistrado {
  id: number | string;
  codSis: string;
  nombre: string;
  apellido: string;
  email: string;
  carrera?: string;
}

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
  colaboradorId?: number | null;
  codSis: string; // Código SIS del estudiante
  nombre: string; // Nombre
  apellido: string; // Apellido
  nombres?: string;
  apellidos?: string;
  nombreCompleto: string; // "Ana Lucía Rojas"
  email: string;
  estado: EstadoColaborador;
  fechaSolicitud: string; // Ej: "10 oct 2026"
  examenesAsignadosIds?: (string | number)[];
  examenesAsignadosCount?: number;
  docenteId?: number | null;
  docenteEmail?: string; // Docente que lo solicitó
  docenteNombre?: string; // Ej: "Luis Medina" o "Elena Paredes"
  aprobadoPor?: string; // "Admin" o "—"
  fechaRespuesta?: string; // "07 oct 2026" o "—"
  usuarioExiste?: boolean;
  rol?: string; // "Personal de control"
}
