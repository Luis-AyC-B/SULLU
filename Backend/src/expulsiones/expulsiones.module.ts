import { Module } from '@nestjs/common';
import { ExpulsionesController } from './expulsiones.controller';
import { ExpulsionesService } from './expulsiones.service';

@Module({
  controllers: [ExpulsionesController],
  providers: [ExpulsionesService],
  exports: [ExpulsionesService],
})
export class ExpulsionesModule {}
