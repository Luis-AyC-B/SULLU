import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { EstudianteAuthService } from './estudiante-auth.service';
import { LoginEstudianteDto } from './dto/login-estudiante.dto';

@Controller('auth/estudiante')
export class EstudianteAuthController {
  constructor(private readonly auth: EstudianteAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginEstudianteDto, @Req() req: any) {
    return this.auth.login(dto, req.ip);
  }
}