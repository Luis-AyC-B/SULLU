import 'multer';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExamenEstudiantesService } from './examen-estudiantes.service';
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';
import { UpdateEstadoEstudianteDto } from './dto/update-estado-estudiante.dto';
// import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('examenes/:examenId/estudiantes')
export class ExamenEstudiantesController {
  constructor(private readonly service: ExamenEstudiantesService) {}

  // Task 7
  @Get()
  // @Permissions('estudiantes.ver')
  findByExamen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Query() query: QueryEstudiantesExamenDto,
  ) {
    return this.service.findByExamen(examenId, query);
  }

  // Task 9
  @Post()
  // @Permissions('estudiantes.registrar')
  @HttpCode(HttpStatus.CREATED)
  registrarManual(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Body() dto: CreateEstudianteExamenDto,
  ) {
    return this.service.registrarManual(examenId, dto);
  }

  // Task 8
  @Post('masivo')
  // @Permissions('estudiantes.registrar')
  @UseInterceptors(FileInterceptor('archivo'))
  cargaMasiva(
    @Param('examenId', ParseIntPipe) examenId: number,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.service.cargaMasiva(examenId, archivo);
  }

  // Task 10
  @Patch(':estudianteId/estado')
  // @Permissions('estudiantes.habilitar')
  actualizarEstado(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Body() dto: UpdateEstadoEstudianteDto,
  ) {
    return this.service.actualizarEstado(examenId, estudianteId, dto);
  }
}
