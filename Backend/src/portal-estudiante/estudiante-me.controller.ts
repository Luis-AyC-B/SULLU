import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { EstudianteJwtGuard } from './estudiante-jwt.guard';
import { EstudianteMeService } from './estudiante-me.service';

@Controller('estudiantes/me')
@UseGuards(EstudianteJwtGuard)
export class EstudianteMeController {
  constructor(private readonly me: EstudianteMeService) {}

  @Get('examenes')
  examenes(@Req() req: any) {
    return this.me.examenes(req.estudiante.estudianteId);
  }

  @Get('qr')
  qr(@Req() req: any) {
    return this.me.qrPersonal(req.estudiante.estudianteId);
  }
}