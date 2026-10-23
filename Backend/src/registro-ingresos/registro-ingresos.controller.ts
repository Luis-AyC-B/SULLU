import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RegistroIngresosService } from './registro-ingresos.service';

// Tu token trae el id del usuario en "sub" (18)
const uid = (req: any): number =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  Number(req.user?.userId ?? req.user?.id ?? req.user?.sub);

@Controller('examenes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegistroIngresosController {
  constructor(private readonly service: RegistroIngresosService) {}

  @Get('control')
  @Permissions('control_ingreso.ver_examenes_asignados')
  examenesControl(@Req() req: any) {
    return this.service.examenesControl(uid(req));
  }

  @Get(':id/ingresos')
  @Permissions('registro_ingresos.ver')
  ingresos(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.ingresos(id, uid(req));
  }
}
