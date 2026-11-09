import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpulsionesModule } from '../expulsiones/expulsiones.module';
import { IngresosService } from './ingresos.service';
import { IngresosController } from './ingresos.controller';
import { ControlIngresoController } from './control-ingreso.controller';

@Module({
  imports: [PrismaModule, ExpulsionesModule],
  controllers: [IngresosController, ControlIngresoController],
  providers: [IngresosService],
  exports: [IngresosService],
})
export class IngresosModule {}
