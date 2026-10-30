import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  ParseIntPipe,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { CreateExamenDto } from './dto/create-examen.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { QueryExamenDto } from './dto/query-examen.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DashboardAsistenciaResponseDto } from './dto/dashboard-asistencia-response.dto';

interface RequestWithUser {
  user?: {
    id: number;
    permisos?: string[];
  };
}

/** El admin se detecta por el permiso 'usuarios.crear' en el token */
function esAdmin(req: RequestWithUser): boolean {
  return (req.user?.permisos ?? []).includes('usuarios.crear');
}

// Convierte los IDs que llegan como texto desde el front (solo si vienen informados).
function normalizarIds<T extends Record<string, any>>(body: T): T {
  const out: Record<string, any> = { ...body };
  for (const campo of ['materiaId', 'ambienteId', 'reservaAmbienteId']) {
    if (out[campo] !== undefined && out[campo] !== null && out[campo] !== '') {
      out[campo] = Number(out[campo]);
    } else {
      delete out[campo];
    }
  }
  return out as T;
}

@ApiTags('examenes')
@ApiBearerAuth()
@Controller('examenes')
export class ExamenesController {
  constructor(private readonly examenesService: ExamenesService) {}

  // --- ENDPOINTS PÚBLICOS ---
  @Get('publicos')
  getPublicos() {
    return this.examenesService.getExamenesPublicos();
  }

  @Get('calendario')
  getCalendario() {
    return this.examenesService.getExamenesPublicos();
  }

  // --- ENDPOINTS PRIVADOS CON GUARD DE AUTENTICACIÓN Y PERMISOS ---
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.ver')
  @Get('tipos')
  getTiposExamen() {
    return this.examenesService.getTiposExamen();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.ver')
  @Get('mis-materias')
  getMisMaterias(@Req() req: RequestWithUser) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    return this.examenesService.getMateriasDocente(userId, esAdmin(req));
  }

  // Lo que debe listar el select de aula del formulario: solo las reservas del docente.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.ver')
  @Get('mis-ambientes')
  getMisAmbientes(@Req() req: RequestWithUser) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    return this.examenesService.getMisAmbientes(userId, esAdmin(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.crear')
  @Post()
  create(
    // Body crudo para que el ValidationPipe no bloquee los IDs en formato texto
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    const payload = normalizarIds(body) as CreateExamenDto;
    return this.examenesService.create(payload, userId, esAdmin(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.ver')
  @Get()
  findAll(@Query() query: QueryExamenDto, @Req() req: RequestWithUser) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    return this.examenesService.findAll(query, userId, esAdmin(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.editar')
  @Patch(':id')
  updatePatch(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    const payload = normalizarIds(body) as UpdateExamenDto;
    return this.examenesService.update(+id, payload, userId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.editar')
  @Put(':id')
  updatePut(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    const payload = normalizarIds(body) as UpdateExamenDto;
    return this.examenesService.update(+id, payload, userId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.eliminar')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.examenesService.remove(+id, req.user!.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.eliminar')
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.examenesService.remove(+id, req.user!.id);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('examenes.ver')
  @Get(':id/asistencia')
  @ApiOperation({
    summary: 'Dashboard de asistencia en tiempo real del examen (HU16)',
    description:
      'Retorna cantidad de estudiantes habilitados, presentes y ausentes para el docente responsable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de asistencia del examen en tiempo real',
    type: DashboardAsistenciaResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado para ver la asistencia de este examen',
  })
  @ApiResponse({
    status: 404,
    description: 'Examen no localizado',
  })
  getDashboardAsistencia(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    return this.examenesService.getDashboardAsistencia(
      id,
      userId,
      esAdmin(req),
    );
  }
}

// Controlador público complementario para garantizar acceso sin restricciones de ruta
@Controller('examenes-publicos')
export class ExamenesPublicosController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get()
  getExamenesPublicos() {
    return this.examenesService.getExamenesPublicos();
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('materias')
export class MateriasController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get()
  @Permissions('examenes.ver')
  async getMaterias(@Req() req: RequestWithUser) {
    // TODO: Eliminar fallback hardcodeado '|| 2' una vez unificada la sesión en todos los módulos
    const userId = req.user?.id || 2;
    return this.examenesService.getMateriasDocente(userId, esAdmin(req));
  }
}
