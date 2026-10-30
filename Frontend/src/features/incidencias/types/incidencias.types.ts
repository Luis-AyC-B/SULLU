import { z } from "zod";

/* Motivos */

export const MOTIVOS_EXPULSION = [
  "MATERIAL_NO_AUTORIZADO",
  "USO_CELULAR",
  "COMUNICACION_ENTRE_ESTUDIANTES",
  "SUPLANTACION_IDENTIDAD",
  "OTRO",
] as const;

export type MotivoExpulsion = (typeof MOTIVOS_EXPULSION)[number];

export const ETIQUETA_MOTIVO_EXPULSION: Record<MotivoExpulsion, string> = {
  MATERIAL_NO_AUTORIZADO: "Material no autorizado",
  USO_CELULAR: "Uso de celular",
  COMUNICACION_ENTRE_ESTUDIANTES: "Comunicación entre estudiantes",
  SUPLANTACION_IDENTIDAD: "Suplantación de identidad",
  OTRO: "Otro",
};

export const OPCIONES_MOTIVO_EXPULSION = MOTIVOS_EXPULSION.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_MOTIVO_EXPULSION[valor],
}));

export const DETALLE_MAXIMO = 500;

/* Respuestas del backend */

export const examenExpulsionSchema = z.object({
  id: z.coerce.string(),
  nombre: z.string(),
  ubicacion: z.string().nullish(),
  enCurso: z.boolean(),
});
export type ExamenExpulsion = z.infer<typeof examenExpulsionSchema>;
export const examenesExpulsionSchema = z.array(examenExpulsionSchema);

export const incidenciaSchema = z.object({
  id: z.coerce.string(),
  examenId: z.coerce.string(),
  // ISO asignado por el servidor
  fechaHora: z.string(),
  codigoSis: z.string(),
  estudianteNombre: z.string(),
  motivo: z.enum(MOTIVOS_EXPULSION),
  detalle: z.string(),
  registradoPor: z.string(),
});
export type Incidencia = z.infer<typeof incidenciaSchema>;
export const incidenciasSchema = z.array(incidenciaSchema);

export const estudianteExpulsableSchema = z.object({
  codigoSis: z.string(),
  nombre: z.string(),
});
export type EstudianteExpulsable = z.infer<typeof estudianteExpulsableSchema>;
export const estudiantesExpulsablesSchema = z.array(estudianteExpulsableSchema);

/* Formulario */

export const formularioExpulsionSchema = z.object({
  estudiante: z.object(
    { codigoSis: z.string(), nombre: z.string() },
    { error: "Selecciona un estudiante" },
  ),
  motivo: z.enum(MOTIVOS_EXPULSION, { error: "Selecciona un motivo" }),
  detalle: z
    .string()
    .trim()
    .min(1, "El detalle es obligatorio")
    .max(DETALLE_MAXIMO, `Máximo ${DETALLE_MAXIMO} caracteres`),
});

export type ValoresFormularioExpulsion = z.infer<
  typeof formularioExpulsionSchema
>;

// La hora y el docente NUNCA viajan desde el cliente.
export interface PayloadRegistrarExpulsion {
  examenId: string;
  codigoSis: string;
  motivo: MotivoExpulsion;
  detalle: string;
}

export function aPayloadRegistrarExpulsion(
  examenId: string,
  valores: ValoresFormularioExpulsion,
): PayloadRegistrarExpulsion {
  return {
    examenId,
    codigoSis: valores.estudiante.codigoSis,
    motivo: valores.motivo,
    detalle: valores.detalle.trim(),
  };
}

/* Utilidades de formato */

export function formatearHoraIncidencia(fechaHora: string): string {
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return "--:--:--";
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

export function etiquetaContadorIncidencias(total: number): string {
  return total === 1
    ? "1 incidencia registrada para este examen"
    : `${total} incidencias registradas para este examen`;
}