/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { UsuarioResponseDto } from './usuario-response.dto';

export class LoginResponseDto {
  @ApiProperty({ description: 'Token de acceso JWT' })
  access_token!: string;

  @ApiProperty({ type: () => UsuarioResponseDto })
  usuario!: UsuarioResponseDto;
}