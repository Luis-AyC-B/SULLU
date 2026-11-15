import { Module } from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import {
  ExamenesController,
  ExamenesPublicosController,
  MateriasController,
} from './examenes.controller';
import { ObservacionesIngresoModule } from '../observaciones-ingreso/observaciones-ingreso.module';

@Module({
  imports: [ObservacionesIngresoModule],
  controllers: [
    ExamenesController,
    ExamenesPublicosController,
    MateriasController,
  ],
  providers: [ExamenesService],
})
export class ExamenesModule {}
