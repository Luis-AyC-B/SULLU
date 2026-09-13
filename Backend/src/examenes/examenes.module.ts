import { Module } from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { ExamenesController } from './examenes.controller';

@Module({
  controllers: [ExamenesController],
  providers: [ExamenesService],
})
export class ExamenesModule {}
