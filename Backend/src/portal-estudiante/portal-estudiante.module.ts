import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ComparadorFacialModule } from './facial/comparador-facial.module';
import { EstudianteAuthController } from './estudiante-auth.controller';
import { EstudianteAuthService } from './estudiante-auth.service';
import { EstudianteJwtGuard } from './estudiante-jwt.guard';
import { EstudianteMeController } from './estudiante-me.controller';
import { EstudianteMeService } from './estudiante-me.service';
import { EstudianteAdminController } from './estudiante-admin.controller';
import { QrTokenService } from './qr-token.service';

@Module({
  imports: [PrismaModule, JwtModule.register({}), ComparadorFacialModule],
  controllers: [
    EstudianteAuthController,
    EstudianteMeController,
    EstudianteAdminController,
  ],
  providers: [
    EstudianteAuthService,
    EstudianteJwtGuard,
    EstudianteMeService,
    QrTokenService,
  ],
  exports: [QrTokenService, EstudianteMeService, ComparadorFacialModule],
})
export class PortalEstudianteModule {}
