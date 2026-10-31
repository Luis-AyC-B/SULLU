import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RegistroIngresosService } from './registro-ingresos.service';

// El id del usuario viene en "sub" del token
const uid = (req: any): number =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  Number(req.user?.userId ?? req.user?.id ?? req.user?.sub);

@ApiTags('registro-ingresos')
@ApiBearerAuth()
@Controller('examenes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegistroIngresosController {
  constructor(private readonly service: RegistroIngresosService) {}

  @Get('control')
  @Permissions('registro_ingresos.ver')
  @ApiOperation({
    summary: 'Listar exámenes asignados al usuario para control de ingreso',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de exámenes que el usuario puede controlar',
  })
  examenesControl(@Req() req: any) {
    return this.service.examenesControl(uid(req));
  }

  @Get(':id/ingresos')
  @Permissions('registro_ingresos.ver')
  @ApiOperation({
    summary: 'Listar historial de ingresos registrados de un examen',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial cronológico de ingresos con métricas de asistencia',
  })
  ingresos(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.ingresos(id, uid(req));
  }

  @Get(':id/reporte-pdf')
  @Permissions('registro_ingresos.ver')
  @ApiOperation({
    summary: 'Descargar reporte oficial de asistencia en PDF del examen (HU17)',
    description:
      'Genera y descarga el documento oficial en formato PDF con membrete institucional, métricas de asistencia y nómina de estudiantes.',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'Archivo binario PDF con el reporte oficial de asistencia',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado para generar el reporte de este examen',
  })
  @ApiResponse({
    status: 404,
    description: 'Examen no localizado',
  })
  async descargarReportePdf(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.service.generarReportePdf(
      id,
      uid(req),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    res.end(buffer);
  }
}
