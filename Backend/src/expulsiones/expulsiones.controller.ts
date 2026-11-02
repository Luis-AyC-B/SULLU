/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ExpulsionesService } from './expulsiones.service';
import { CrearExpulsionDto } from './dto/crear-expulsion.dto';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpulsionesController {
  constructor(private readonly service: ExpulsionesService) {}

  // 1. Selector de exámenes: GET /expulsiones/examenes
  @Permissions('expulsiones.ver')
  @Get('expulsiones/examenes')
  obtenerExamenes(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    return this.service.listarExamenesParaExpulsion(Number(userId));
  }

  // 2. Listado de expulsiones por examen: GET /examenes/:id/expulsiones
  @Permissions('expulsiones.ver')
  @Get('examenes/:id/expulsiones')
  listarPorExamen(
    @Param('id') examenId: string,
    @Query('buscar') buscar: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    return this.service.listar(Number(examenId), Number(userId), buscar);
  }

  // 3. Estudiantes elegibles: GET /examenes/:id/expulsiones/estudiantes?q=
  @Permissions('expulsiones.registrar')
  @Get('examenes/:id/expulsiones/estudiantes')
  estudiantesElegibles(
    @Param('id') examenId: string,
    @Query('q') consulta: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    return this.service.estudiantesElegibles(
      Number(examenId),
      Number(userId),
      consulta,
    );
  }

  // 4. Crear expulsión: POST /expulsiones
  @Permissions('expulsiones.registrar')
  @Post('expulsiones')
  crear(@Body() dto: CrearExpulsionDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub || req.user?.userId;
    return this.service.crear(dto, Number(userId), req.ip);
  }
}
