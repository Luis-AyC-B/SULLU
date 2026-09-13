import { Module } from '@nestjs/common';
import { HabilitacionesService } from './habilitaciones.service';
import { HabilitacionesController } from './habilitaciones.controller';

@Module({
  controllers: [HabilitacionesController],
  providers: [HabilitacionesService],
})
export class HabilitacionesModule {}
