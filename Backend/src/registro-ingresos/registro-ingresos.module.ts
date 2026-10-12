import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RegistroIngresosController } from './registro-ingresos.controller';
import { RegistroIngresosService } from './registro-ingresos.service';

@Module({
  imports: [PrismaModule],
  controllers: [RegistroIngresosController],
  providers: [RegistroIngresosService],
})
export class RegistroIngresosModule {}