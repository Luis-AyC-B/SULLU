import { Module } from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { ExamenesController, MateriasController } from './examenes.controller';

@Module({
  controllers: [ExamenesController, MateriasController],
  providers: [ExamenesService],
})
export class ExamenesModule {}
