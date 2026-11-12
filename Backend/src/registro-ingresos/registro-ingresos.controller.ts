import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
    summary:
      'Listar exámenes controlables por el usuario para el selector de registro de ingresos (HU17)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de exámenes controlables con fecha y nombre compuesto',
  })
  examenesControl(@Req() req: any) {
    return this.service.examenesControl(uid(req));
  }

  @Get(':id/ingresos')
  @Permissions('registro_ingresos.ver')
  @ApiOperation({
    summary:
      'Listar ingresos en tiempo real de un examen (HU17 - tabla de registro de ingresos)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del examen',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas y lista de ingresos registrados en vivo',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para controlar este examen',
  })
  @ApiResponse({
    status: 404,
    description: 'El examen no existe',
  })
  ingresos(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.ingresos(id, uid(req));
  }

  @Get([':id/reporte-pdf', ':id/reporte-asistencia'])
  @Permissions('registro_ingresos.ver')
  @ApiOperation({
    summary:
      'Descargar reporte oficial de asistencia del examen en formato PDF (HU17)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID del examen',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo binario del PDF generado',
  })
  @ApiResponse({
    status: 400,
    description: 'No hay ingresos registrados para descargar',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el docente responsable puede descargar el reporte',
  })
  @ApiResponse({
    status: 404,
    description: 'El examen no existe',
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
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    res.end(buffer);
  }
}
