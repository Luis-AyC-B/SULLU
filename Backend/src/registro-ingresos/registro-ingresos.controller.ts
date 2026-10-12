import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // AJUSTAR
import { PermissionsGuard } from '../auth/guards/permissions.guard'; // AJUSTAR
import { Permissions } from '../auth/decorators/permissions.decorator'; // AJUSTAR
import { RegistroIngresosService } from './registro-ingresos.service';

// AJUSTAR según lo que ponga tu JwtStrategy en req.user
const uid = (req: any): number =>
  Number(req.user?.userId ?? req.user?.id ?? req.user?.sub);

@Controller('examenes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegistroIngresosController {
  constructor(private readonly service: RegistroIngresosService) {}

  @Get('control')
  @Permissions('ingresos.ver')
  examenesControl(@Req() req: any) {
    return this.service.examenesControl(uid(req));
  }

  @Get(':id/ingresos')
  @Permissions('ingresos.ver')
  ingresos(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.ingresos(id, uid(req));
  }
}