import { Module } from '@nestjs/common';
import { AmbientesModule } from '../ambientes/ambientes.module';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
@Module({
  imports: [AmbientesModule],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
