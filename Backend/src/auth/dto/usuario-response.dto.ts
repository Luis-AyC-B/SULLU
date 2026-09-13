import { ApiProperty } from '@nestjs/swagger';

export class UsuarioResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Administrador' })
  nombre: string;

  @ApiProperty({ example: 'admin@exacontrol.com' })
  email: string;

  @ApiProperty({ example: 'Administrador' })
  rol: string;
}
