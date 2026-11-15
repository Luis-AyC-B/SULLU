import { CasoIncidencia } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const MOTIVOS_EXPULSION = [
  'MATERIAL_NO_AUTORIZADO',
  'USO_CELULAR',
  'COMUNICACION_ENTRE_ESTUDIANTES',
  'SUPLANTACION_IDENTIDAD',
  'OTRO',
] as const;

export type MotivoExpulsionClave = (typeof MOTIVOS_EXPULSION)[number];

const MAPA_ETIQUETAS_A_CLAVE: Record<string, MotivoExpulsionClave> = {
  MATERIAL_NO_AUTORIZADO: 'MATERIAL_NO_AUTORIZADO',
  'Material no autorizado': 'MATERIAL_NO_AUTORIZADO',
  USO_CELULAR: 'USO_CELULAR',
  'Uso de celular': 'USO_CELULAR',
  COMUNICACION_ENTRE_ESTUDIANTES: 'COMUNICACION_ENTRE_ESTUDIANTES',
  'Comunicación entre estudiantes': 'COMUNICACION_ENTRE_ESTUDIANTES',
  'Comunicacion entre estudiantes': 'COMUNICACION_ENTRE_ESTUDIANTES',
  SUPLANTACION_IDENTIDAD: 'SUPLANTACION_IDENTIDAD',
  'Suplantación de identidad': 'SUPLANTACION_IDENTIDAD',
  'Suplantacion de identidad': 'SUPLANTACION_IDENTIDAD',
  OTRO: 'OTRO',
  Otro: 'OTRO',
};

const normalizarMotivo = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return MAPA_ETIQUETAS_A_CLAVE[trimmed] ?? trimmed;
  }
  return value;
};

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearExpulsionDto {
  @IsString()
  @IsNotEmpty({ message: 'El examen es obligatorio' })
  examenId!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El estudiante es obligatorio' })
  codigoSis!: string;

  @IsOptional()
  @IsEnum(CasoIncidencia, { message: 'El caso no es válido' })
  caso?: CasoIncidencia;

  @Transform(normalizarMotivo)
  @IsIn(MOTIVOS_EXPULSION, { message: 'El motivo no es válido' })
  motivo!: MotivoExpulsionClave;

  @Transform(trim)
  @IsOptional()
  @IsString({ message: 'El detalle debe ser texto' })
  @MaxLength(500, { message: 'El detalle no puede superar los 500 caracteres' })
  detalle?: string;

  @IsOptional()
  estudianteId?: unknown;

  @IsOptional()
  id?: unknown;
}
