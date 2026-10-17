import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { ReservasService } from './reservas.service';
import { ReservaResponseDto } from './dto/reserva-response.dto';
@ApiTags('reservas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiResponse({ status: 401, description: 'JWT inválido' })
@ApiResponse({ status: 403, description: 'Sin permiso o usuario inactivo' })
@ApiResponse({
  status: 409,
  description: 'Periodo ocupado o reserva con examen vigente',
})
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}
  @Post()
  @Permissions('ambientes.registrar_reserva')
  @ApiOperation({ summary: 'Reservar periodo libre con identidad del JWT' })
  @ApiResponse({ status: 201, type: ReservaResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Fecha, identificadores o body inválidos',
  })
  create(@Body() dto: CreateReservaDto, @Req() req: { user: { id: number } }) {
    return this.reservas.create(dto, req.user.id);
  }
  @Get('mis-reservas')
  @Permissions('ambientes.ver')
  @ApiOperation({ summary: 'Listar exclusivamente reservas activas propias' })
  @ApiResponse({ status: 200, type: [ReservaResponseDto] })
  listar(@Req() req: { user: { id: number } }) {
    return this.reservas.misReservas(req.user.id);
  }
  @Patch(':id/cancelar')
  @HttpCode(204)
  @Permissions('ambientes.cancelar_reserva')
  @ApiOperation({
    summary: 'Cancelar reserva propia sin examen vigente; conserva el registro',
  })
  @ApiResponse({ status: 204, description: 'Reserva cancelada o ya cancelada' })
  @ApiResponse({ status: 404, description: 'Reserva inexistente o ajena' })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.reservas.cancelar(id, req.user.id);
  }
}
