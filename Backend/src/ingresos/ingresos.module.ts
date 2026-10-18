import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IngresosService } from './ingresos.service';
import { IngresosController } from './ingresos.controller';
import { ControlIngresoController } from './control-ingreso.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IngresosController, ControlIngresoController],
  providers: [IngresosService],
  exports: [IngresosService],
})
export class IngresosModule {}
