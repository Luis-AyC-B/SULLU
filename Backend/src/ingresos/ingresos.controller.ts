import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';
import { IngresosService } from './ingresos.service';

@ApiTags('ingresos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Post('manual')
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

  @Post()
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
  @ApiOperation({
    summary: 'Listar ingresos de un examen',
  })
  findByExamen(@Param('examenId', ParseIntPipe) examenId: number) {
    return this.ingresosService.findByExamen(examenId);
  }
}
