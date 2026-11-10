import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RegistroIngresosController } from './registro-ingresos.controller';
import { RegistroIngresosService } from './registro-ingresos.service';
import { AsistenciaPdfService } from './asistencia-pdf.service';

@Module({
  imports: [PrismaModule],
  controllers: [RegistroIngresosController],
  providers: [RegistroIngresosService, AsistenciaPdfService],
  exports: [AsistenciaPdfService],
})
export class RegistroIngresosModule {}
