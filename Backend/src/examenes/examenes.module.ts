import { Module } from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import {
  ExamenesController,
  ExamenesPublicosController,
  MateriasController,
} from './examenes.controller';

@Module({
  controllers: [
    ExamenesController,
    ExamenesPublicosController,
    MateriasController,
  ],
  providers: [ExamenesService],
})
export class ExamenesModule {}
