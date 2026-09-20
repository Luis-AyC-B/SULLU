/* eslint-disable */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsArray, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiProperty({ example: 'juan.perez@exacontrol.com' })
  @IsEmail()
  correo!: string;

  @ApiPropertyOptional({ example: '77712345' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'temporal123' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: [1, 2], description: 'IDs de los roles iniciales' })
  @IsArray()
  @IsNotEmpty()
  rolesIds!: number[];
}
