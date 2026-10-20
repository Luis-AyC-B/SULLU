/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class UsuarioResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Administrador' })
  nombre!: string;

  @ApiProperty({ example: 'admin@exacontrol.com' })
  email!: string;

  @ApiProperty({ example: ['roles.crear', 'roles.ver'] })
  permisos!: string[];

  @ApiProperty({ example: 'Docente', required: false })
  rol?: string;

  @ApiProperty({ example: false, required: false })
  debeCambiarPassword?: boolean;

  @ApiProperty({ example: false, required: false })
  perfilCompleto?: boolean;
}