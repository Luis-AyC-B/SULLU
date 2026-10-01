import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'Juan Carlos' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiPropertyOptional({ example: '77712345' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Nuevos IDs de roles para reemplazar los actuales',
  })
  @IsOptional()
  rolesIds?: number[];
}
