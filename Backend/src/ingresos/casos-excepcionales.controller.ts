import {
  Body,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ConsultaCasosExcepcionalesService } from './consulta-casos-excepcionales.service';
import { CasosExcepcionalesService } from './casos-excepcionales.service';
import { RegistrarCasoExcepcionalDto } from './dto/registrar-caso-excepcional.dto';

@ApiTags('ingresos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ingresos/caso-excepcional')
export class CasosExcepcionalesController {
  constructor(
    private readonly casos: CasosExcepcionalesService,
    private readonly consultas: ConsultaCasosExcepcionalesService,
  ) {}

  @Post()
  @Permissions('casos_excepcionales.registrar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'HU20: Registrar un caso excepcional en un examen propio',
  })
  registrar(
    @Body() dto: RegistrarCasoExcepcionalDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.casos.registrar(dto, user.id, req.ip);
  }

  @Get('examenes')
  @Permissions('registro_ingresos.ver')
  examenes(@CurrentUser() user: AuthenticatedUser) {
    return this.consultas.examenesControl(user.id);
  }

  @Get('examen/:id/ingresos')
  @Permissions('registro_ingresos.ver')
  ingresos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultas.ingresos(id, user.id);
  }

  @Get('examen/:id/estudiantes')
  @Permissions('registro_ingresos.ver', 'casos_excepcionales.registrar')
  estudiantes(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q?: string,
  ) {
    return this.consultas.estudiantes(id, q, user.id);
  }
}
