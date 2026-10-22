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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // AJUSTAR
import { PermissionsGuard } from '../auth/guards/permissions.guard'; // AJUSTAR
import { Permissions } from '../auth/decorators/permissions.decorator'; // AJUSTAR
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { IncidenciasService } from './incidencias.service';

// Usuario que deja JwtAuthGuard en req.user (según la estrategia JWT del proyecto).
interface UsuarioAutenticado {
  userId?: number;
  id?: number;
  sub?: number;
}

type RequestAutenticado = Request & { user?: UsuarioAutenticado };

const uid = (req: RequestAutenticado): number =>
  Number(req.user?.userId ?? req.user?.id ?? req.user?.sub);

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidenciasController {
  constructor(private readonly service: IncidenciasService) {}

  // Exámenes del selector: propios (Docente) o asignados (Personal de control).
  @Get('incidencias/examenes')
  @Permissions('incidencias.ver')
  examenes(@Req() req: RequestAutenticado) {
    return this.service.examenesDelUsuario(uid(req));
  }

  @Get('examenes/:examenId/incidencias')
  @Permissions('incidencias.ver')
  listar(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() req: RequestAutenticado,
  ) {
    return this.service.listar(examenId, uid(req));
  }

  @Post('incidencias')
  @Permissions('incidencias.registrar')
  crear(@Body() dto: CrearIncidenciaDto, @Req() req: RequestAutenticado) {
    return this.service.crear(dto, uid(req), req.ip);
  }
}
