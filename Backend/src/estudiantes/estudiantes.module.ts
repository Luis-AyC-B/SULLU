import { Module } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';
import { ExamenEstudiantesController } from './examen-estudiantes.controller';
import { ExamenEstudiantesService } from './examen-estudiantes.service';

@Module({
  controllers: [EstudiantesController, ExamenEstudiantesController],
  providers: [EstudiantesService, ExamenEstudiantesService],
})
export class EstudiantesModule {}
