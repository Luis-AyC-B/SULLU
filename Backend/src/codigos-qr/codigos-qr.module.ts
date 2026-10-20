import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PortalEstudianteModule } from '../portal-estudiante/portal-estudiante.module';
import { CodigosQrService } from './codigos-qr.service';
import { CodigosQrController } from './codigos-qr.controller';

@Module({
  imports: [PrismaModule, PortalEstudianteModule],
  controllers: [CodigosQrController],
  providers: [CodigosQrService],
  exports: [CodigosQrService],
})
export class CodigosQrModule {}
