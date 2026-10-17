import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { DocenteColaboradorService } from './services/docente-colaborador.service';
import { ExamenControladorService } from './services/examen-controlador.service';
import { SolicitarColaboradorDto } from './dto/solicitar-colaborador.dto';
import { AsignarExamenDto } from './dto/asignar-examen.dto';

@ApiTags('colaboradores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller(['colaboradores', 'docente-colaborador'])
export class ColaboradoresController {
  constructor(
    private readonly docenteColaboradorService: DocenteColaboradorService,
    private readonly examenControladorService: ExamenControladorService,
  ) {}

  @Get(['nomina', ''])
  @Permissions('colaboradores.ver')
  @ApiOperation({
    summary: 'Listar nómina de colaboradores del docente autenticado (HU13)',
  })
  async getNomina(@CurrentUser() user: AuthenticatedUser) {
    return this.docenteColaboradorService.getNominaDocente(user.id);
  }

  @Post('solicitar')
  @Permissions('colaboradores.solicitar')
  @ApiOperation({ summary: 'Enviar solicitud de colaborador (Docente - HU13)' })
  @ApiResponse({
    status: 201,
    description: 'Solicitud creada en estado PENDIENTE',
  })
  async solicitar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SolicitarColaboradorDto,
  ) {
    return this.docenteColaboradorService.solicitarColaborador(user.id, dto);
  }

  @Patch(':id/baja')
  @Permissions('colaboradores.dar_de_baja')
  @ApiOperation({
    summary: 'Dar de baja a un colaborador de la nómina (Docente - HU13)',
  })
  async darDeBaja(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.docenteColaboradorService.darDeBajaColaborador(user.id, id);
  }

  @Get('solicitudes')
  @Permissions('colaboradores.ver_solicitudes', 'colaboradores.aprobar')
  @ApiOperation({
    summary:
      'Listar solicitudes pendientes de colaboradores (Administrador - HU13)',
  })
  async getSolicitudes() {
    return this.docenteColaboradorService.getSolicitudesPendientesAdmin();
  }

  @Get('todos')
  @Permissions('colaboradores.ver_solicitudes', 'colaboradores.aprobar')
  @ApiOperation({
    summary:
      'Listar TODOS los colaboradores de todos los docentes (Administrador - HU13)',
  })
  async getTodos() {
    return this.docenteColaboradorService.getTodosAdmin();
  }

  @Patch('solicitudes/:id/aprobar')
  @Permissions('colaboradores.aprobar')
  @ApiOperation({
    summary: 'Aprobar solicitud de colaborador (Administrador - HU13)',
  })
  async aprobarSolicitud(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.docenteColaboradorService.aprobarSolicitud(id, user.id);
  }

  @Patch('solicitudes/:id/rechazar')
  @Permissions('colaboradores.aprobar')
  @ApiOperation({
    summary: 'Rechazar solicitud de colaborador (Administrador - HU13)',
  })
  async rechazarSolicitud(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.docenteColaboradorService.rechazarSolicitud(id, user.id);
  }

  @Get(':colaboradorId/examenes')
  @Permissions('colaboradores.ver', 'colaboradores.asignar_examen')
  @ApiOperation({
    summary:
      'Listar exámenes asignados y disponibles de un colaborador (Docente - HU13)',
  })
  async getExamenes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
  ) {
    return this.examenControladorService.getExamenesColaborador(
      colaboradorId,
      user.id,
    );
  }

  @Post('asignar-examen')
  @Permissions('colaboradores.asignar_examen')
  @ApiOperation({
    summary: 'Asignar colaborador a un examen programado (Docente - HU13)',
  })
  async asignarExamen(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AsignarExamenDto,
  ) {
    return this.examenControladorService.asignarControlador(
      dto.examenId,
      dto.colaboradorId,
      user.id,
    );
  }

  @Delete('desasignar-examen/:examenId/:colaboradorId')
  @HttpCode(HttpStatus.OK)
  @Permissions('colaboradores.desasignar_examen')
  @ApiOperation({
    summary: 'Retirar colaborador de un examen futuro (Docente - HU13)',
  })
  async desasignarExamen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
  ) {
    return this.examenControladorService.desasignarControlador(
      examenId,
      colaboradorId,
    );
  }

  @Post('desasignar-examen')
  @HttpCode(HttpStatus.OK)
  @Permissions('colaboradores.desasignar_examen')
  @ApiOperation({
    summary: 'Retirar colaborador de un examen vía POST (Docente - HU13)',
  })
  async desasignarExamenBody(@Body() dto: AsignarExamenDto) {
    return this.examenControladorService.desasignarControlador(
      dto.examenId,
      dto.colaboradorId,
    );
  }
}
