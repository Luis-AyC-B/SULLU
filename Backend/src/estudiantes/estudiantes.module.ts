import { Module } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';
import { ExamenEstudiantesController } from './examen-estudiantes.controller';
import { ExamenEstudiantesService } from './examen-estudiantes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CargasEstudiantesModule } from '../cargas-estudiantes/cargas-estudiantes.module';

@Module({
  imports: [PrismaModule, CargasEstudiantesModule],
  controllers: [EstudiantesController, ExamenEstudiantesController],
  providers: [EstudiantesService, ExamenEstudiantesService],
})
export class EstudiantesModule {}
