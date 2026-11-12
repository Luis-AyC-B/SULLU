import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FiltroObservacionesDto } from './dto/filtro-observaciones.dto';
import { ObservacionesIngresoService } from './observaciones-ingreso.service';

@ApiTags('observaciones-ingreso')
@ApiBearerAuth()
@Controller('observaciones-ingreso')
@UseGuards(JwtAuthGuard)
export class ObservacionesIngresoController {
  constructor(private readonly service: ObservacionesIngresoService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar observaciones de ingreso con filtros de ámbito y motivo (HU18)',
    description:
      'Lista observaciones filtradas con paginación y contador total. Aplica alcance estricto por rol: Administrador (acceso total), Docente (sus materias), Personal de control (sus exámenes asignados), Roles personalizados (su alcance).',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de observaciones obtenido con éxito',
  })
  @ApiResponse({
    status: 400,
    description: 'Gestión inválida o parámetros incorrectos',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado / Fuera de alcance o módulo deshabilitado',
  })
  listar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltroObservacionesDto,
  ) {
    return this.service.listar(user, filtros);
  }

  @Get('pdf')
  @ApiOperation({
    summary:
      'Descargar reporte de observaciones de ingreso en PDF (HU18 vía GET)',
    description:
      'Genera y descarga el PDF institucional con logos, agrupado por examen y ordenado por facultad, carrera, materia y fecha. Registra bitácora de auditoría (HU21).',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'Archivo binario PDF con el reporte de observaciones',
  })
  @ApiResponse({
    status: 400,
    description:
      'Gestión inválida o no hay observaciones que coincidan con los filtros',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado / Fuera de alcance o módulo deshabilitado',
  })
  async descargarPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltroObservacionesDto,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.service.generarReportePdf(
      user,
      filtros,
      ip,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    res.end(buffer);
  }

  @Post('pdf')
  @ApiOperation({
    summary:
      'Descargar reporte de observaciones de ingreso en PDF (HU18 vía POST)',
    description:
      'Permite enviar los filtros seleccionados en el cuerpo de la petición para descargar el PDF institucional.',
  })
  @ApiProduces('application/pdf')
  async descargarPdfPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() bodyFiltros: FiltroObservacionesDto,
    @Query() queryFiltros: FiltroObservacionesDto,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const filtrosCombinados: FiltroObservacionesDto = {
      ...queryFiltros,
      ...bodyFiltros,
    };
    const { buffer, filename } = await this.service.generarReportePdf(
      user,
      filtrosCombinados,
      ip,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    res.end(buffer);
  }

  @Get('reporte/pdf')
  @ApiOperation({
    summary: 'Alias de descarga de reporte de observaciones en PDF',
  })
  @ApiProduces('application/pdf')
  descargarReportePdfAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltroObservacionesDto,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    return this.descargarPdf(user, filtros, ip, res);
  }
}
