/* eslint-disable prettier/prettier, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Dev: Gustavo Montaño
 * Date: 18/09/2026
 * Funcionalidad: Intercepta la petición, verifica si el usuario autenticado tiene el permiso exigido por el decorador y valida que el módulo asociado esté activo (HU3 - Task 3bh, 3bi).
 * @param context - Contexto de ejecución de NestJS
 * @return Booleano que permite o deniega el acceso al endpoint
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permisos) {
      throw new ForbiddenException('Usuario no autenticado o sin permisos cargados');
    }

    const hasPermission = requiredPermissions.some((perm) => user.permisos.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción');
    }

    const moduloClave = requiredPermissions[0].split('.')[0]; 
    const moduloNombre = moduloClave.toUpperCase(); 

    const modulo = await this.prisma.modulo.findFirst({
      where: { nombre: moduloNombre }
    });

    if (modulo && !modulo.activo) {
      throw new ForbiddenException(`El módulo ${moduloNombre} se encuentra inactivo actualmente`);
    }

    return true;
  }
}