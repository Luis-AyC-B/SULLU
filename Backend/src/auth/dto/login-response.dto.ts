import { ApiProperty } from '@nestjs/swagger';
import { UsuarioResponseDto } from './usuario-response.dto';

export class LoginResponseDto {
  @ApiProperty({
    description:
      'Token JWT a usar como Bearer token en el header Authorization',
  })
  access_token: string;

  @ApiProperty({ type: UsuarioResponseDto })
  usuario: UsuarioResponseDto;
}
