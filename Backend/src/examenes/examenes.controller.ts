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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { CreateExamenDto } from './dto/create-examen.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { QueryExamenDto } from './dto/query-examen.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('examenes')
export class ExamenesController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get('tipos')
  @Permissions('examenes.ver')
  getTiposExamen() {
    return this.examenesService.getTiposExamen();
  }

  @Get('mis-materias')
  @Permissions('examenes.ver')
  getMisMaterias(@Req() req: { user: { id: number } }) {
    return this.examenesService.getMateriasDocente(req.user.id);
  }

  @Get('ambientes')
  @Permissions('examenes.ver')
  getAmbientesDisponibles() {
    return this.examenesService.getAmbientes();
  }

  @Post()
  @Permissions('examenes.crear')
  create(
    @Body() createExamenDto: CreateExamenDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.examenesService.create(createExamenDto, req.user.id);
  }

  @Get()
  @Permissions('examenes.ver')
  findAll(
    @Query() query: QueryExamenDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.examenesService.findAll(query, req.user.id);
  }

  // Soporta tanto PATCH como PUT (que es el que usa el frontend de Andrea)
  @Patch(':id')
  @Permissions('examenes.editar')
  updatePatch(
    @Param('id') id: string,
    @Body() updateExamenDto: UpdateExamenDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.examenesService.update(+id, updateExamenDto, req.user.id);
  }

  @Put(':id')
  @Permissions('examenes.editar')
  updatePut(
    @Param('id') id: string,
    @Body() updateExamenDto: UpdateExamenDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.examenesService.update(+id, updateExamenDto, req.user.id);
  }

  // Soporta DELETE y el PATCH de desactivar que manda el frontend
  @Delete(':id')
  @Permissions('examenes.eliminar')
  remove(@Param('id') id: string) {
    return this.examenesService.remove(+id);
  }

  @Patch(':id/desactivar')
  @Permissions('examenes.eliminar')
  desactivar(@Param('id') id: string) {
    return this.examenesService.remove(+id);
  }
}

// Controlador puente para atrapar la ruta /materias que pide el frontend de Andrea
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('materias')
export class MateriasController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Get()
  @Permissions('examenes.ver')
  getMaterias(@Req() req: { user: { id: number } }) {
    return this.examenesService.getMateriasDocente(req.user.id);
  }
}
