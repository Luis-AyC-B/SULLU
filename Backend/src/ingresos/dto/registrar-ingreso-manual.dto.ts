import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistrarIngresoManualDto {
  @ApiProperty({
    example: 1,
    description: 'ID del examen al que se registra el ingreso',
  })
  @Type(() => Number)
  @IsInt({ message: 'El ID del examen debe ser un número entero' })
  examenId!: number;

  @ApiProperty({
    example: '201901234',
    description: 'Código SIS o Cédula de Identidad del estudiante',
  })
  @IsString({ message: 'El identificador debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código SIS o CI es obligatorio' })
  identificador!: string;

  @ApiPropertyOptional({
    example: 'd1985f3e-81fa-40f8-bb3b-648b2d2f7823',
    description:
      'UUID generado por el cliente para idempotencia y control de sincronización',
  })
  @IsOptional()
  @IsString()
  clienteSyncId?: string;
}
