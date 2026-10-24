import { Module } from '@nestjs/common';
import { CargasEstudiantesService } from './cargas-estudiantes.service';
import { CargasEstudiantesController } from './cargas-estudiantes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [CargasEstudiantesController],
  providers: [CargasEstudiantesService],
  exports: [CargasEstudiantesService],
})
export class CargasEstudiantesModule {}
