/* eslint-disable prettier/prettier */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModuleActiveGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // Consultar el estado del módulo 'Roles' en la base de datos
    const modulo = await this.prisma.modulo.findUnique({
      where: { nombre: 'Roles' },
    });

    // Si el módulo no existe o su propiedad activo es false, se bloquea el acceso por completo
    if (!modulo || !modulo.activo) {
      throw new ForbiddenException('El módulo de Roles se encuentra inactivo y el acceso está restringido.');
    }

    return true;
  }
}