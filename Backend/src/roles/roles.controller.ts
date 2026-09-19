/* eslint-disable prettier/prettier */
/**
 * Dev: Gustavo Montaño
 * Date: 18/09/2026
 * Funcionalidad: Controlador REST para el módulo de gestión de roles. Protegido con JWT y PermissionsGuard para validar accesos a nivel de endpoint (HU3 - Task 3bj).
 * @param rolesService - Inyección de dependencias del servicio de roles
 * @return Respuestas HTTP con los DTOs o entidades procesadas
 */
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-role.dto';
import { UpdateRolDto } from './dto/update-role.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleActiveGuard } from '../auth/guards/module-active.guard';
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleActiveGuard) // El JWT inyecta el usuario, el PermissionsGuard valida sus permisos
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('roles.crear')
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolesService.create(createRolDto);
  }

  @Get()
  @Permissions('roles.ver')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permisos/agrupados')
  @Permissions('roles.ver', 'roles.crear', 'roles.editar') // Permite el acceso si tiene al menos uno de estos
  getPermisosCatalog() {
    return this.rolesService.getModulosConPermisos();
  }

  @Get('plantillas/base')
  @Permissions('roles.ver', 'roles.crear', 'roles.editar')
  getPlantillasCatalog() {
    return this.rolesService.getPlantillasBase();
  }

  @Put(':id')
  @Permissions('roles.editar')
  update(@Param('id') id: string, @Body() updateRolDto: UpdateRolDto) {
    return this.rolesService.update(+id, updateRolDto);
  }

  @Delete(':id')
  @Permissions('roles.eliminar')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }
}