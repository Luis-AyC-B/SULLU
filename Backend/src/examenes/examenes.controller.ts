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
} from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { CreateExamenDto } from './dto/create-examen.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { QueryExamenDto } from './dto/query-examen.dto';

interface RequestWithUser {
  user?: {
    id: number;
  };
}

@Controller('examenes')
export class ExamenesController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get('tipos')
  getTiposExamen() {
    return this.examenesService.getTiposExamen();
  }

  @Get('mis-materias')
  getMisMaterias(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 2;
    return this.examenesService.getMateriasDocente(userId);
  }

  @Post()
  create(
    // Extraemos el body crudo para que el ValidationPipe no bloquee los IDs en formato texto
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    const payload = {
      ...body,
      materiaId: Number(body.materiaId),
      ambienteId: Number(body.ambienteId),
    } as CreateExamenDto;
    return this.examenesService.create(payload, userId);
  }

  @Get()
  findAll(@Query() query: QueryExamenDto, @Req() req: RequestWithUser) {
    const userId = req.user?.id || 2;
    return this.examenesService.findAll(query, userId);
  }

  @Patch(':id')
  updatePatch(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    const payload = { ...body } as UpdateExamenDto;
    if (payload.materiaId) payload.materiaId = Number(payload.materiaId);
    if (payload.ambienteId) payload.ambienteId = Number(payload.ambienteId);
    return this.examenesService.update(+id, payload, userId);
  }

  @Put(':id')
  updatePut(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id || 2;
    const payload = { ...body } as UpdateExamenDto;
    if (payload.materiaId) payload.materiaId = Number(payload.materiaId);
    if (payload.ambienteId) payload.ambienteId = Number(payload.ambienteId);
    return this.examenesService.update(+id, payload, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examenesService.remove(+id);
  }

  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.examenesService.remove(+id);
  }
}

@Controller('materias')
export class MateriasController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get()
  async getMaterias(@Req() req: RequestWithUser) {
    console.log('\n=== DEBUG MATERIAS ===');
    console.log('ID real detectado en el token:', req.user?.id);
    const userId = 2;
    console.log('Forzando búsqueda de materias para el usuario:', userId);
    const materias = await this.examenesService.getMateriasDocente(userId);
    console.log('Materias que se enviarán al frontend:', materias);
    return materias;
  }
}
