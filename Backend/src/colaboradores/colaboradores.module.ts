import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ColaboradoresController } from './colaboradores.controller';
import { DocenteColaboradorService } from './services/docente-colaborador.service';
import { ExamenControladorService } from './services/examen-controlador.service';

@Module({
  imports: [PrismaModule],
  controllers: [ColaboradoresController],
  providers: [DocenteColaboradorService, ExamenControladorService],
  exports: [DocenteColaboradorService, ExamenControladorService],
})
export class ColaboradoresModule {}
