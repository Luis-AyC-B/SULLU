import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IngresosService } from './ingresos.service';
import { ParticionControladorService } from './particion-controlador.service';
import { IngresosController } from './ingresos.controller';
import { ControlIngresoController } from './control-ingreso.controller';

import { CasosExcepcionalesService } from './casos-excepcionales.service';
import { CasosExcepcionalesController } from './casos-excepcionales.controller';
import { ConsultaCasosExcepcionalesService } from './consulta-casos-excepcionales.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    IngresosController,
    ControlIngresoController,
    CasosExcepcionalesController,
  ],
  providers: [
    IngresosService,
    ParticionControladorService,
    CasosExcepcionalesService,
    ConsultaCasosExcepcionalesService,
  ],
  exports: [
    IngresosService,
    ParticionControladorService,
    CasosExcepcionalesService,
  ],
})
export class IngresosModule {}
