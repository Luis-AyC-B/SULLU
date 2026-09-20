import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ExamenEstudiantesService } from './examen-estudiantes.service';
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';
// import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('examenes/:examenId/estudiantes')
export class ExamenEstudiantesController {
  constructor(private readonly service: ExamenEstudiantesService) {}

  @Get()
  // @Permissions('estudiantes.ver')
  findByExamen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Query() query: QueryEstudiantesExamenDto,
  ) {
    return this.service.findByExamen(examenId, query);
  }

  @Post()
  // @Permissions('estudiantes.registrar')
  @HttpCode(HttpStatus.CREATED)
  registrarManual(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Body() dto: CreateEstudianteExamenDto,
  ) {
    return this.service.registrarManual(examenId, dto);
  }
}
