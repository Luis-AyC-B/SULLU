import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { IngresosService } from './ingresos.service';
import { ExamenAsignadoResponseDto } from './dto/examen-asignado-response.dto';
import { ResumenExamenResponseDto } from './dto/resumen-examen-response.dto';

@ApiTags('control-ingreso')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller(['control-ingreso', 'control'])
export class ControlIngresoController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Get(['mis-examenes', 'examenes'])
  @Permissions('control_ingreso.ver_examenes_asignados')
  @ApiOperation({
    summary:
      'Listar exámenes asignados al colaborador de control autenticado (HU7)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista ordenada cronológicamente de exámenes activos asignados',
    type: [ExamenAsignadoResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos requeridos de control de ingreso',
  })
  async getMisExamenes(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamenAsignadoResponseDto[]> {
    return this.ingresosService.getMisExamenes(user.id);
  }

  @Get(['examenes/:id/resumen', ':id/resumen'])
  @Permissions('control_ingreso.ver_examenes_asignados')
  @ApiOperation({
    summary:
      'Obtener métricas en tiempo real y últimos ingresos de un examen asignado',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del examen',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen en vivo con métricas y últimos ingresos',
    type: ResumenExamenResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No asignado al examen solicitado',
  })
  @ApiResponse({
    status: 404,
    description: 'Examen no encontrado',
  })
  async getResumenExamen(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResumenExamenResponseDto> {
    return this.ingresosService.getResumenExamen(id, user);
  }

  @Get(['examenes/:id', ':id'])
  @Permissions('control_ingreso.ver_examenes_asignados')
  @ApiOperation({
    summary: 'Obtener datos de un examen asignado individual',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del examen',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del examen asignado',
    type: ExamenAsignadoResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No asignado al examen solicitado',
  })
  @ApiResponse({
    status: 404,
    description: 'Examen no encontrado',
  })
  async getExamenDetalle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamenAsignadoResponseDto> {
    return this.ingresosService.getExamenDetalle(id, user);
  }
}
