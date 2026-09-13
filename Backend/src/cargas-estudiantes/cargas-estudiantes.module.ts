import { Module } from '@nestjs/common';
import { CargasEstudiantesService } from './cargas-estudiantes.service';
import { CargasEstudiantesController } from './cargas-estudiantes.controller';

@Module({
  controllers: [CargasEstudiantesController],
  providers: [CargasEstudiantesService],
})
export class CargasEstudiantesModule {}
