import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
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

@Controller('examenes')
export class ExamenesController {
  constructor(private readonly examenesService: ExamenesService) {}

  // --- ENDPOINTS PÚBLICOS (ACCESIBLES DESDE LA PÁGINA DE BIENVENIDA / CALENDARIO) ---
  @Get('publicos')
  getPublicos() {
    return this.examenesService.getExamenesPublicos();
  }

  @Get('calendario')
  getCalendario() {
    return this.examenesService.getExamenesPublicos();
  }

  // --- ENDPOINTS PRIVADOS CON GUARD DE AUTENTICACIÓN ---
  @UseGuards(JwtAuthGuard)
  @Get('tipos')
  getTiposExamen() {
    return this.examenesService.getTiposExamen();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mis-materias')
  getMisMaterias(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 2;
    return this.examenesService.getMateriasDocente(userId, esAdmin(req));
  }

  // Lo que debe listar el select de aula del formulario: solo las reservas del docente.
  @UseGuards(JwtAuthGuard)
  @Get('mis-ambientes')
  getMisAmbientes(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 2;
    return this.examenesService.getMisAmbientes(userId, esAdmin(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    // Body crudo para que el ValidationPipe no bloquee los IDs en formato texto
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    const payload = normalizarIds(body) as CreateExamenDto;
    return this.examenesService.create(payload, userId, esAdmin(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: QueryExamenDto, @Req() req: RequestWithUser) {
    const userId = req.user?.id || 2;
    return this.examenesService.findAll(query, userId, esAdmin(req));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updatePatch(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    const payload = normalizarIds(body) as UpdateExamenDto;
    return this.examenesService.update(+id, payload, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updatePut(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    const payload = normalizarIds(body) as UpdateExamenDto;
    return this.examenesService.update(+id, payload, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examenesService.remove(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.examenesService.remove(+id);
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

@UseGuards(JwtAuthGuard)
@Controller('materias')
export class MateriasController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get()
  async getMaterias(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 2;
    return this.examenesService.getMateriasDocente(userId, esAdmin(req));
  }
}
