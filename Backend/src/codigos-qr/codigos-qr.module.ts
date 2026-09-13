import { Module } from '@nestjs/common';
import { CodigosQrService } from './codigos-qr.service';
import { CodigosQrController } from './codigos-qr.controller';

@Module({
  controllers: [CodigosQrController],
  providers: [CodigosQrService],
})
export class CodigosQrModule {}
