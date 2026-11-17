import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuditoriaService } from './auditoria.service';
import { ConsultaAuditoriaDto } from './dto/consulta-auditoria.dto';
import { RestaurarRespaldoDto } from './dto/restaurar-respaldo.dto';

@ApiTags('auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @Get()
  listar(
    @Query() dto: ConsultaAuditoriaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoria.listar(dto, user.id);
  }

  @Get('opciones')
  opciones(@CurrentUser() user: AuthenticatedUser) {
    return this.auditoria.opciones(user.id);
  }

  @Get('respaldos')
  respaldos(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set('Cache-Control', 'no-store');
    return this.auditoria.respaldos(user.id);
  }

  @Post('respaldos/restauraciones')
  restaurar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RestaurarRespaldoDto,
  ) {
    return this.auditoria.solicitarRestauracion(user.id, dto);
  }

  @Get('respaldos/programacion')
  programacionRespaldos(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set('Cache-Control', 'no-store');
    return this.auditoria.programacionRespaldos(user.id);
  }

  @Post('respaldos/solicitudes')
  solicitarRespaldo(@CurrentUser() user: AuthenticatedUser) {
    return this.auditoria.solicitarRespaldo(user.id);
  }

  @Get('reporte')
  async reporte(
    @Query() dto: ConsultaAuditoriaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { buffer, nombre } = await this.auditoria.reporte(dto, user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  }

  @Get(':id')
  detalle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoria.detalle(id, user.id);
  }
}
