import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerificarIngresoQrDto {
  @ApiProperty({
    example: 1,
    description: 'ID del examen al que se registra el ingreso',
  })
  @Type(() => Number)
  @IsInt({ message: 'El ID del examen debe ser un número entero' })
  examenId!: number;

  @ApiProperty({
    example: 'qr_test_alejandro_bd1_a1b2c3d4e5f6',
    description: 'Token decodificado del código QR escaneado',
  })
  @IsString({ message: 'El token del QR debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token del QR es obligatorio' })
  token!: string;

  @ApiPropertyOptional({
    example: 'd1985f3e-81fa-40f8-bb3b-648b2d2f7823',
    description:
      'UUID generado por el cliente para idempotencia y control de sincronización',
  })
  @IsOptional()
  @IsString()
  clienteSyncId?: string;
}
