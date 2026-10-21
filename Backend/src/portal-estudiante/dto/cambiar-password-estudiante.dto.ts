import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CambiarPasswordEstudianteDto {
  @ApiProperty({
    description: 'Contraseña actual del estudiante',
    example: 'Temporal123',
  })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  @IsString()
  passwordActual: string;

  @ApiProperty({
    description:
      'Nueva contraseña elegida por el estudiante (8 a 12 caracteres, al menos una letra y un número)',
    example: 'segura123',
  })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener entre 8 y 12 caracteres',
  })
  @MaxLength(12, {
    message: 'La nueva contraseña debe tener entre 8 y 12 caracteres',
  })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: 'La nueva contraseña debe contener al menos una letra y un número',
  })
  passwordNueva: string;

  @ApiPropertyOptional({
    description: 'Confirmación de la nueva contraseña',
    example: 'segura123',
  })
  @IsOptional()
  @IsString()
  confirmar?: string;

  @ApiPropertyOptional({
    description: 'Confirmación alternativa de contraseña',
    example: 'segura123',
  })
  @IsOptional()
  @IsString()
  confirmarPassword?: string;
}
