import { z } from "zod";

/* Casos de incidencia */

export const CASOS_INCIDENCIA = [
  "EXPULSION",
  "SUPLANTACION_IDENTIDAD",
  "AMONESTACION",
  "PROBLEMA_MEDICO",
  "RETIRO_VOLUNTARIO",
  "INCIDENCIA_TECNICA",
  "OTRO",
] as const;

export type CasoIncidencia = (typeof CASOS_INCIDENCIA)[number];

export const ETIQUETA_CASO_INCIDENCIA: Record<CasoIncidencia, string> = {
  EXPULSION: "Expulsión",
  SUPLANTACION_IDENTIDAD: "Suplantación de identidad",
  AMONESTACION: "Amonestación verbal",
  PROBLEMA_MEDICO: "Problema de salud / médico",
  RETIRO_VOLUNTARIO: "Retiro voluntario",
  INCIDENCIA_TECNICA: "Incidencia técnica / material",
  OTRO: "Otro caso",
};

export const OPCIONES_CASO_INCIDENCIA = CASOS_INCIDENCIA.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_CASO_INCIDENCIA[valor],
}));

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
  id: z
    .coerce
    .string()
    .nullable()
    .optional()
    .transform((v) => (v != null ? String(v) : ""))
    .default(""),
  nombre: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? "Examen")
    .default("Examen"),
  ubicacion: z.string().nullish(),
  enCurso: z
    .boolean()
    .nullable()
    .optional()
    .transform((v) => v ?? false)
    .default(false),
});
export type ExamenExpulsion = z.infer<typeof examenExpulsionSchema>;
export const examenesExpulsionSchema = z.array(examenExpulsionSchema);

export const incidenciaSchema = z.object({
  id: z
    .coerce
    .string()
    .nullable()
    .optional()
    .transform((v) => (v != null ? String(v) : ""))
    .default(""),
  examenId: z
    .coerce
    .string()
    .nullable()
    .optional()
    .transform((v) => (v != null ? String(v) : ""))
    .default(""),
  // ISO asignado por el servidor
  fechaHora: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? new Date().toISOString())
    .default(() => new Date().toISOString()),
  codigoSis: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? "")
    .default(""),
  estudianteNombre: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? "")
    .default(""),
  caso: z
    .enum(CASOS_INCIDENCIA)
    .nullable()
    .optional()
    .transform((v) => v ?? "EXPULSION")
    .default("EXPULSION"),
  motivo: z
    .enum(MOTIVOS_EXPULSION)
    .nullable()
    .optional()
    .transform((v) => v ?? "OTRO")
    .default("OTRO"),
  detalle: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? "")
    .default(""),
  registradoPor: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? "")
    .default(""),
});
export type Incidencia = z.infer<typeof incidenciaSchema>;
export const incidenciasSchema = z.array(incidenciaSchema);

export const estudianteExpulsableSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  estudianteId: z.union([z.string(), z.number()]).optional(),
  codigoSis: z.string(),
  nombre: z.string(),
});
export type EstudianteExpulsable = z.infer<typeof estudianteExpulsableSchema>;
export const estudiantesExpulsablesSchema = z.array(estudianteExpulsableSchema);

/* Formulario */

export const formularioExpulsionSchema = z.object({
  estudiante: z.object(
    {
      id: z.union([z.string(), z.number()]).optional(),
      estudianteId: z.union([z.string(), z.number()]).optional(),
      codigoSis: z.string(),
      nombre: z.string(),
    },
    { error: "Selecciona un estudiante" },
  ),
  caso: z.enum(CASOS_INCIDENCIA, { error: "Selecciona un caso" }),
  motivo: z.enum(MOTIVOS_EXPULSION, { error: "Selecciona un motivo" }),
  detalle: z
    .string()
    .trim()
    .max(DETALLE_MAXIMO, `Máximo ${DETALLE_MAXIMO} caracteres`)
    .default(""),
});

export type ValoresFormularioExpulsion = z.infer<
  typeof formularioExpulsionSchema
>;

// La hora y el docente NUNCA viajan desde el cliente.
export interface PayloadRegistrarExpulsion {
  examenId: string;
  codigoSis: string;
  estudianteId?: string | number;
  id?: string | number;
  caso: CasoIncidencia;
  motivo: MotivoExpulsion;
  detalle: string;
}

export function aPayloadRegistrarExpulsion(
  examenId: string,
  valores: ValoresFormularioExpulsion,
): PayloadRegistrarExpulsion {
  const estudianteId =
    valores.estudiante.estudianteId ?? valores.estudiante.id;
  return {
    examenId,
    codigoSis: valores.estudiante.codigoSis,
    ...(estudianteId !== undefined ? { estudianteId, id: estudianteId } : {}),
    caso: valores.caso,
    motivo: valores.motivo,
    detalle: (valores.detalle ?? "").trim(),
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
