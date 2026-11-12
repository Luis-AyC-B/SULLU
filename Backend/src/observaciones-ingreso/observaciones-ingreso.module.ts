import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ObservacionesIngresoController } from './observaciones-ingreso.controller';
import { ObservacionesIngresoService } from './observaciones-ingreso.service';
import { ObservacionesPdfService } from './observaciones-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [ObservacionesIngresoController],
  providers: [ObservacionesIngresoService, ObservacionesPdfService],
  exports: [ObservacionesIngresoService],
})
export class ObservacionesIngresoModule {}
