import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({
    description: 'Carnet de identidad del estudiante (formato boliviano)',
    example: '8912345',
  })
  @IsOptional()
  @IsString({ message: 'El CI debe ser una cadena de texto' })
  @MaxLength(15, { message: 'El CI no puede exceder los 15 caracteres' })
  @Matches(/^[0-9]{5,10}(-[0-9A-Za-z]{1,3})?$/, {
    message:
      'El carnet de identidad debe tener entre 5 y 10 dígitos numéricos (con complemento opcional, ej: 8912345 o 8912345-1E)',
  })
  ci?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono o celular del estudiante (8 dígitos)',
    example: '71234567',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(15, { message: 'El teléfono no puede exceder los 15 caracteres' })
  @Matches(/^[67][0-9]{7}$|^[0-9]{8}$/, {
    message:
      'El teléfono debe ser un número celular boliviano válido de 8 dígitos',
  })
  telefono?: string;
}
