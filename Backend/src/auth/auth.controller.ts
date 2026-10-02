import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    console.log('.');
    const usuario = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(usuario);
  }

  @Post('recuperar-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña por correo' })
  @ApiResponse({ status: 200, description: 'Respuesta neutra de seguridad' })
  solicitarRecuperacion(@Body() body: { email: string }) {
    return this.authService.solicitarRecuperacion(body.email);
  }

  @Post('resetear-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token de recuperación' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  resetearPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetearPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el usuario autenticado a partir del token JWT',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario autenticado',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente, inválido o expirado',
  })
  me(@CurrentUser() user: AuthenticatedUser): UsuarioResponseDto {
    return user;
  }
}
