import {
  Controller,
  ForbiddenException,
  ParseIntPipe,
  Param,
  Post,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
    if (req.estudiante?.estudianteId) return req.estudiante.estudianteId;
    const u = req.user ?? {};
    if (u.estudianteId) return Number(u.estudianteId);
    const usuarioId = Number(u.usuarioId ?? u.sub ?? u.id);
    if (usuarioId) {
      const est = await this.prisma.estudiante.findUnique({
        where: { usuarioId },
      });
      if (est) return est.id;
    }
    throw new ForbiddenException();
  }

  @Post('examenes/:examenId/qr')
  @UseInterceptors(
    FileInterceptor('selfie', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  async generar(
    @Req() req: any,
    @Param('examenId', ParseIntPipe) examenId: number,
    @UploadedFile() selfie?: Express.Multer.File,
  ) {
    const estudianteId = await this.estudianteIdDeSesion(req);
    return this.service.generar(estudianteId, examenId, selfie);
  }
}
