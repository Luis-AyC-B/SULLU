import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({
    description: 'Número de teléfono o celular del estudiante',
    example: '71234567',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El teléfono no puede exceder los 20 caracteres' })
  @Matches(/^[0-9+\s-]{7,15}$/, {
    message: 'El teléfono debe contener entre 7 y 15 dígitos numéricos',
  })
  telefono?: string;
}
