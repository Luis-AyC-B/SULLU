import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  EstudianteElegibleDto,
  ExpulsionResponseDto,
  ExpulsionesService,
} from './expulsiones.service';
import { CrearExpulsionDto } from './dto/crear-expulsion.dto';

interface RequestConUsuario extends Request {
  user?: {
    id?: number;
    sub?: number;
    userId?: number;
  };
}

const extraerUserId = (req: RequestConUsuario): number =>
  Number(req.user?.id ?? req.user?.sub ?? req.user?.userId ?? 0);

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpulsionesController {
  constructor(private readonly service: ExpulsionesService) {}

  // 1. Selector de exámenes: GET /expulsiones/examenes
  @Permissions('expulsiones.ver')
  @Get('expulsiones/examenes')
  obtenerExamenes(@Req() req: RequestConUsuario) {
    return this.service.listarExamenesParaExpulsion(extraerUserId(req));
  }

  // 2. Listado de expulsiones por examen: GET /examenes/:id/expulsiones
  @Permissions('expulsiones.ver')
  @Get('examenes/:id/expulsiones')
  listarPorExamen(
    @Param('id') examenId: string,
    @Query('buscar') buscar: string,
    @Req() req: RequestConUsuario,
  ): Promise<ExpulsionResponseDto[]> {
    return this.service.listar(Number(examenId), extraerUserId(req), buscar);
  }

  // 3. Estudiantes elegibles: GET /examenes/:id/expulsiones/estudiantes?q=
  @Permissions('expulsiones.registrar')
  @Get('examenes/:id/expulsiones/estudiantes')
  estudiantesElegibles(
    @Param('id') examenId: string,
    @Query('q') consulta: string,
    @Req() req: RequestConUsuario,
  ): Promise<EstudianteElegibleDto[]> {
    return this.service.estudiantesElegibles(
      Number(examenId),
      extraerUserId(req),
      consulta,
    );
  }

  // 4. Crear expulsión: POST /expulsiones
  @Permissions('expulsiones.registrar')
  @Post('expulsiones')
  @HttpCode(HttpStatus.CREATED)
  crear(
    @Body() dto: CrearExpulsionDto,
    @Req() req: RequestConUsuario,
  ): Promise<ExpulsionResponseDto> {
    return this.service.crear(dto, extraerUserId(req), req.ip);
  }
}
