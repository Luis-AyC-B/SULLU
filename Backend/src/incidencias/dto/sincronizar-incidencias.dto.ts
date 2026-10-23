import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MotivoIncidencia } from './crear-incidencia.dto';

export class ItemIncidenciaOfflineDto {
  @ApiProperty({
    example: 'd1985f3e-81fa-40f8-bb3b-648b2d2f7823',
    description: 'UUID generado offline por el cliente para idempotencia',
  })
  @IsString({ message: 'El clienteSyncId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El clienteSyncId es obligatorio' })
  clienteSyncId!: string;

  @ApiProperty({
    example: '1',
    description: 'ID del examen',
  })
  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    value === undefined || value === null ? value : String(value),
  )
  @IsString()
  @IsNotEmpty({ message: 'El ID del examen es obligatorio' })
  examenId!: string;

  @ApiProperty({
    example: '201901234',
    description: 'Código SIS del estudiante',
  })
  @IsString()
  @MaxLength(50, { message: 'El código SIS debe tener máximo 50 caracteres' })
  codigoSis!: string;

  @ApiProperty({
    enum: MotivoIncidencia,
    example: MotivoIncidencia.NO_HABILITADO,
    description: 'Motivo de la incidencia',
  })
  @IsEnum(MotivoIncidencia, { message: 'Motivo no válido' })
  motivo!: MotivoIncidencia;

  @ApiPropertyOptional({
    example: 'Estudiante no figura en lista impresa',
    description: 'Observaciones adicionales de la incidencia',
  })
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500, { message: 'Máximo 500 caracteres' })
  observaciones?: string;

  @ApiPropertyOptional({
    example: '2026-10-12T18:30:00.000Z',
    description: 'Fecha y hora en que se capturó offline en el dispositivo',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fechaHoraCaptura debe tener un formato ISO 8601 válido' },
  )
  fechaHoraCaptura?: string;
}

export class SincronizarIncidenciasDto {
  @ApiProperty({
    type: [ItemIncidenciaOfflineDto],
    description: 'Lista de incidencias capturadas offline a sincronizar',
  })
  @IsArray({ message: 'incidencias debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => ItemIncidenciaOfflineDto)
  incidencias!: ItemIncidenciaOfflineDto[];
}
