import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';

export enum MotivoObservacion {
  NO_HABILITADO = 'NO_HABILITADO',
  DOBLE_MARCACION = 'DOBLE_MARCACION',
  QR_OTRO_EXAMEN = 'QR_OTRO_EXAMEN',
  QR_NO_VALIDO = 'QR_NO_VALIDO',
  QR_EXAMEN_VENCIDO = 'QR_EXAMEN_VENCIDO',
}

export const transformarVacio = ({ value }: { value: unknown }) => {
  if (
    value === '' ||
    value === null ||
    value === undefined ||
    value === 'null' ||
    value === 'undefined' ||
    value === 'TODOS' ||
    value === 'TODAS'
  ) {
    return undefined;
  }
  return value;
};

export const transformarIdONombre = ({ value }: { value: unknown }) => {
  const v = transformarVacio({ value });
  if (v === undefined) return undefined;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
    return Number(v.trim());
  }
  if (typeof v === 'number') {
    return v;
  }
  return typeof v === 'string' ? v.trim() : v;
};

export class FiltroObservacionesDto {
  @IsOptional()
  @Transform(transformarIdONombre)
  facultadId?: number | string;

  @IsOptional()
  @Transform(transformarIdONombre)
  carreraId?: number | string;

  @IsOptional()
  @Transform(transformarIdONombre)
  docenteId?: number | string;

  @IsOptional()
  @Transform(transformarIdONombre)
  materiaId?: number | string;

  @IsOptional()
  @Transform(transformarIdONombre)
  examenId?: number | string;

  @IsOptional()
  @Transform(transformarVacio)
  @IsEnum(MotivoObservacion, {
    message:
      'Motivo no válido. Valores permitidos: NO_HABILITADO, DOBLE_MARCACION, QR_OTRO_EXAMEN, QR_NO_VALIDO, QR_EXAMEN_VENCIDO',
  })
  motivo?: MotivoObservacion;

  @IsOptional()
  @Transform(transformarVacio)
  @IsString({ message: 'La gestión debe ser una cadena de texto' })
  @Matches(/^Gest[ií]ón\s+[12]\/\d{4}$/i, {
    message:
      'Formato de gestión inválido. Debe ser "Gestión 1/2026" o "Gestión 2/2026"',
  })
  gestion?: string;

  @IsOptional()
  @Transform(transformarVacio)
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @IsPositive({ message: 'La página debe ser positiva' })
  page?: number;

  @IsOptional()
  @Transform(transformarVacio)
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @IsPositive({ message: 'El límite debe ser positivo' })
  limit?: number;
}
