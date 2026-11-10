import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IngresosService } from './ingresos.service';
import { ParticionControladorService } from './particion-controlador.service';
import { IngresosController } from './ingresos.controller';
import { ControlIngresoController } from './control-ingreso.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IngresosController, ControlIngresoController],
  providers: [IngresosService, ParticionControladorService],
  exports: [IngresosService, ParticionControladorService],
})
export class IngresosModule {}
