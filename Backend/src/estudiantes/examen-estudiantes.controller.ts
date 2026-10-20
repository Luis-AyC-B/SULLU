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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExamenEstudiantesService } from './examen-estudiantes.service';
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';
import { UpdateEstadoEstudianteDto } from './dto/update-estado-estudiante.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('examenes/:examenId/estudiantes')
export class ExamenEstudiantesController {
  constructor(private readonly service: ExamenEstudiantesService) {}

  // Task 7
  @Get()
  @Permissions('estudiantes.ver', 'control_ingreso.registro_manual')
  findByExamen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Query() query: QueryEstudiantesExamenDto,
  ) {
    return this.service.findByExamen(examenId, query);
  }

  // Task 9
  @Post()
  @Permissions('estudiantes.cargar')
  @HttpCode(HttpStatus.CREATED)
  registrarManual(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Body() dto: CreateEstudianteExamenDto,
  ) {
    return this.service.registrarManual(examenId, dto);
  }

  // Task 8
  @Post('masivo')
  @Permissions('estudiantes.cargar')
  @UseInterceptors(FileInterceptor('archivo'))
  cargaMasiva(
    @Param('examenId', ParseIntPipe) examenId: number,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.service.cargaMasiva(examenId, archivo);
  }

  // Task 10
  @Patch(':estudianteId/estado')
  @Permissions('estudiantes.habilitar')
  actualizarEstado(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Body() dto: UpdateEstadoEstudianteDto,
  ) {
    return this.service.actualizarEstado(examenId, estudianteId, dto);
  }
}
