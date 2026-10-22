import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ItemIngresoOfflineDto {
  @ApiProperty({
    example: 'd1985f3e-81fa-40f8-bb3b-648b2d2f7823',
    description: 'UUID generado offline por el cliente para idempotencia',
  })
  @IsString({ message: 'El clienteSyncId debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El clienteSyncId es obligatorio' })
  clienteSyncId!: string;

  @ApiProperty({
    example: 1,
    description: 'ID del examen',
  })
  @Type(() => Number)
  @IsInt({ message: 'El ID del examen debe ser un número entero' })
  examenId!: number;

  @ApiProperty({
    example: '201901234',
    description: 'Código SIS, CI o token del QR capturado',
  })
  @IsString({ message: 'El identificador debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El identificador es obligatorio' })
  identificador!: string;

  @ApiProperty({
    example: 'MANUAL',
    enum: ['MANUAL', 'QR'],
    description: 'Método utilizado en el registro offline',
  })
  @IsString()
  @IsNotEmpty({ message: 'El método es obligatorio (MANUAL o QR)' })
  metodo!: string;

  @ApiPropertyOptional({
    example: '2026-10-12T18:30:00.000Z',
    description: 'Fecha y hora en que se capturó offline en el dispositivo',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fechaHora debe tener un formato ISO 8601 válido' },
  )
  fechaHora?: string;
}

export class SincronizarIngresosDto {
  @ApiProperty({
    type: [ItemIngresoOfflineDto],
    description:
      'Lista de ingresos capturados en modo offline para sincronizar',
  })
  @IsArray({ message: 'Los ingresos deben enviarse como un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => ItemIngresoOfflineDto)
  ingresos!: ItemIngresoOfflineDto[];
}
