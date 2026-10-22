import { Controller, ForbiddenException, ParseIntPipe, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstudianteJwtGuard } from './estudiante-jwt.guard';
import { QrExamenService } from './qr-examen.service';

@Controller('estudiantes/me')
@UseGuards(EstudianteJwtGuard)
export class QrExamenController {
  constructor(
    private readonly service: QrExamenService,
    private readonly prisma: PrismaService,
  ) {}

  // El estudianteId SALE DE LA SESIÓN; nunca del body ni de la URL.
  private async estudianteIdDeSesion(req: any): Promise<number> {
    const u = req.user ?? {};
    if (u.estudianteId) return Number(u.estudianteId);
    const usuarioId = Number(u.usuarioId ?? u.sub ?? u.id);
    if (usuarioId) {
      const est = await this.prisma.estudiante.findUnique({ where: { usuarioId } });
      if (est) return est.id;
    }
    throw new ForbiddenException();
  }

  @Post('examenes/:examenId/qr')
  async generar(@Req() req: any, @Param('examenId', ParseIntPipe) examenId: number) {
    const estudianteId = await this.estudianteIdDeSesion(req);
    return this.service.generar(estudianteId, examenId); // 201 por defecto en POST
  }
}
