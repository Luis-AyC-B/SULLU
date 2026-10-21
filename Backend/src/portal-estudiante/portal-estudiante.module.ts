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
import { VALIDADOR_FOTO_TOKEN } from './validador-foto/validador-foto.interface';
import { ValidadorFotoStubService } from './validador-foto/validador-foto-stub.service';

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
    {
      provide: VALIDADOR_FOTO_TOKEN,
      useClass: ValidadorFotoStubService,
    },
  ],
  exports: [
    QrTokenService,
    EstudianteMeService,
    ComparadorFacialModule,
    VALIDADOR_FOTO_TOKEN,
  ],
})
export class PortalEstudianteModule {}
