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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';
import { SincronizarIngresosDto } from './dto/sincronizar-ingresos.dto';
import { VerificarIngresoQrDto } from './dto/verificar-ingreso-qr.dto';
import { IngresosService } from './ingresos.service';

@ApiTags('ingresos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Post('manual')
  @Permissions('control_ingreso.registro_manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar ingreso manual por Código SIS o CI (HU8)',
  })
  @ApiResponse({ status: 200, description: 'Ingreso registrado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Estudiante inhabilitado o no pertenece al examen',
  })
  @ApiResponse({
    status: 404,
    description: 'Examen o estudiante no encontrado',
  })
  @ApiResponse({ status: 409, description: 'Doble marcación detectada' })
  registrarManual(
    @Body() dto: RegistrarIngresoManualDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingresosService.registrarIngresoManual(dto, user.id);
  }

  @Post('qr')
  @Permissions('control_ingreso.escanear_qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar ingreso mediante código QR (HU9)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingreso por QR registrado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Código QR expirado, estudiante inhabilitado o no pertenece al examen',
  })
  @ApiResponse({
    status: 404,
    description: 'Código QR o examen no encontrado',
  })
  @ApiResponse({ status: 409, description: 'Doble marcación detectada' })
  registrarQr(
    @Body() dto: VerificarIngresoQrDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingresosService.registrarIngresoQr(dto, user.id);
  }

  @Post('sincronizar')
  @Permissions('control_ingreso.escanear_qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sincronizar ingresos capturados en modo offline en lote',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lote sincronizado exitosamente con detalle de ingresados, omitidos y rechazados',
  })
  sincronizarOffline(
    @Body() dto: SincronizarIngresosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingresosService.sincronizarEnLote(dto, user.id);
  }

  @Post()
  @Permissions('control_ingreso.registro_manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar ingreso manual (alias)',
  })
  create(
    @Body() dto: RegistrarIngresoManualDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ingresosService.registrarIngresoManual(dto, user.id);
  }

  @Get('examen/:examenId')
  @Permissions('registro_ingresos.ver')
  @ApiOperation({
    summary: 'Listar ingresos de un examen',
  })
  findByExamen(@Param('examenId', ParseIntPipe) examenId: number) {
    return this.ingresosService.findByExamen(examenId);
  }

  @Get('examen/:examenId/estudiantes')
  @Permissions(
    'control_ingreso.registro_manual',
    'control_ingreso.ver_examenes_asignados',
    'control_ingreso.escanear_qr',
    'registro_ingresos.ver',
  )
  @ApiOperation({
    summary:
      'Buscar estudiantes inscritos en el examen para registro manual o control',
  })
  buscarEstudiantesExamen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Query('q') q?: string,
  ) {
    return this.ingresosService.buscarEstudiantesExamen(examenId, q);
  }
}
