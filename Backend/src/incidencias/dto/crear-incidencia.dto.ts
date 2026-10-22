import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export enum MotivoIncidencia {
  NO_HABILITADO = 'NO_HABILITADO',
}

export class CrearIncidenciaDto {
  @IsString()
  @Matches(/^\d{1,15}$/, {
    message: 'El código SIS debe tener solo dígitos (1 a 15)',
  })
  codigoSis!: string;

  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value),
  )
  @IsString()
  @IsNotEmpty({ message: 'El examen es obligatorio' })
  examenId!: string;

  @IsEnum(MotivoIncidencia, { message: 'Motivo no válido' })
  motivo!: MotivoIncidencia;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500, { message: 'Máximo 500 caracteres' })
  observaciones?: string;
}
