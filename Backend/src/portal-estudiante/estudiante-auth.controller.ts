import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { EstudianteAuthService } from './estudiante-auth.service';

@Controller('auth/estudiante')
export class EstudianteAuthController {
  constructor(private readonly auth: EstudianteAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.GONE)
  login() {
    throw new HttpException(
      'El login de estudiantes fue migrado al login general /auth/login con correo institucional',
      HttpStatus.GONE,
    );
  }
}