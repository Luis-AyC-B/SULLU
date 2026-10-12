import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // AJUSTAR
import { PermissionsGuard } from '../auth/guards/permissions.guard'; // AJUSTAR
import { Permissions } from '../auth/decorators/permissions.decorator'; // AJUSTAR
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { IncidenciasService } from './incidencias.service';

const uid = (req: any): number =>
  Number(req.user?.userId ?? req.user?.id ?? req.user?.sub);

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidenciasController {
  constructor(private readonly service: IncidenciasService) {}

  @Get('examenes/:examenId/incidencias')
  @Permissions('incidencias.ver')
  listar(@Param('examenId', ParseIntPipe) examenId: number, @Req() req: any) {
    return this.service.listar(examenId, uid(req));
  }

  @Post('incidencias')
  @Permissions('incidencias.crear')
  crear(@Body() dto: CrearIncidenciaDto, @Req() req: any) {
    return this.service.crear(dto, uid(req), req.ip);
  }
}
