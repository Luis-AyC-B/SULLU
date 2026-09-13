import { Module } from '@nestjs/common';
import { AmbientesService } from './ambientes.service';
import { AmbientesController } from './ambientes.controller';

@Module({
  controllers: [AmbientesController],
  providers: [AmbientesService],
})
export class AmbientesModule {}
