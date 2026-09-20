/* eslint-disable */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateAlcanceDto } from './dto/update-alcance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Permissions('usuarios.crear')
  @ApiOperation({ summary: 'Registrar un nuevo usuario con roles' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @Permissions('usuarios.ver')
  @ApiOperation({ summary: 'Listar usuarios con paginación y búsqueda' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'rolId', required: false, type: Number })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('rolId') rolId?: number,
  ) {
    return this.usuariosService.findAll(page || 1, limit || 10, search, rolId);
  }

  @Get(':id')
  @Permissions('usuarios.ver')
  @ApiOperation({ summary: 'Obtener detalle completo de un usuario' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('usuarios.editar')
  @ApiOperation({ summary: 'Actualizar datos personales básicos del usuario' })
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(+id, updateUsuarioDto);
  }

  @Patch(':id/password')
  @Permissions('usuarios.editar')
  @ApiOperation({ summary: 'Reseteo de contraseña de usuario por el administrador' })
  updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usuariosService.updatePassword(+id, updatePasswordDto);
  }

  @Delete(':id')
  @Permissions('usuarios.desactivar')
  @ApiOperation({ summary: 'Inhabilitar usuario con protección de registros' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(+id);
  }

  @Put(':id/alcance')
  @Permissions('usuarios.editar')
  @ApiOperation({ summary: 'Asignar alcance académico a un usuario' })
  updateAlcance(
    @Param('id') id: string,
    @Body() updateAlcanceDto: UpdateAlcanceDto,
  ) {
    return this.usuariosService.updateAlcance(+id, updateAlcanceDto);
  }
}
