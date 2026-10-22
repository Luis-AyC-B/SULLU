import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AmbientesService, ambienteResponse } from './ambientes.service';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { QueryDisponibilidadDto } from './dto/query-disponibilidad.dto';
import { AmbienteResponseDto } from './dto/ambiente-response.dto';
import { PeriodoDisponibleDto } from './dto/disponibilidad-response.dto';

@ApiTags('ambientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('ambientes.ver')
@ApiResponse({ status: 401, description: 'Sesión inválida' })
@ApiResponse({ status: 403, description: 'Sin permiso o usuario inactivo' })
@Controller('ambientes')
export class AmbientesController {
  constructor(private readonly ambientesService: AmbientesService) {}
  @Get()
  @ApiOperation({ summary: 'Listar ambientes dentro del alcance por facultad' })
  @ApiResponse({ status: 200, type: [AmbienteResponseDto] })
  async findAll(@Req() req: { user: { id: number } }) {
    return (await this.ambientesService.findAll(req.user.id)).map(
      ambienteResponse,
    );
  }
  @Get(':id/disponibilidad')
  @ApiOperation({
    summary: 'Consultar periodos y disponibilidad; no crea reservas',
  })
  @ApiResponse({ status: 200, type: [PeriodoDisponibleDto] })
  @ApiResponse({
    status: 400,
    description: 'Fecha inválida o fuera del intervalo',
  })
  @ApiResponse({
    status: 404,
    description: 'Ambiente inexistente o fuera de alcance',
  })
  @ApiResponse({ status: 409, description: 'Ambiente no habilitado' })
  async disponibilidad(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryDisponibilidadDto,
    @Req() req: { user: { id: number } },
  ) {
    const result = await this.ambientesService.disponibilidad(
      id,
      query.fecha,
      req.user.id,
    );
    return result.periodos.map((p) => ({
      id: p.horarioFijoId,
      periodoNombre: p.periodoNombre,
      horaIni: p.horaIni,
      horaFin: p.horaFin,
      estado: p.disponibilidad,
    }));
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar un ambiente autorizado' })
  @ApiResponse({ status: 200, type: AmbienteResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    return ambienteResponse(
      await this.ambientesService.findOne(id, req.user.id),
    );
  }
  @Patch(':id/estado')
  @Permissions('ambientes.editar')
  @ApiOperation({
    summary: 'Editar estado; bloqueado si hay reservas vigentes al inhabilitar',
  })
  @ApiResponse({ status: 200, type: AmbienteResponseDto })
  @ApiResponse({
    status: 409,
    description: 'El ambiente tiene reservas vigentes',
  })
  async updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoDto,
    @Req() req: { user: { id: number } },
  ) {
    return ambienteResponse(
      await this.ambientesService.updateEstado(id, dto.estado, req.user.id),
    );
  }
}
