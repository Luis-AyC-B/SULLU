/* eslint-disable prettier/prettier, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    // Incluimos las relaciones completas: Usuario -> Usuario_Rol -> Rol -> Rol_Permiso -> Permiso
    const usuario = await this.prisma.usuario.findFirst({
      where: { correo: email },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: {
                  include: {
                    permiso: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return usuario;
  }

  login(usuario: any) {
    // Extraer limpiamente las claves de los permisos a través de las tablas intermedias
    const permisosUsuario: string[] = [];
    if (usuario.roles && Array.isArray(usuario.roles)) {
      usuario.roles.forEach((ur: any) => {
        if (ur.rol && ur.rol.permisos && Array.isArray(ur.rol.permisos)) {
          ur.rol.permisos.forEach((rp: any) => {
            if (rp.permiso && rp.permiso.clave) {
              permisosUsuario.push(rp.permiso.clave);
            }
          });
        }
      });
    }

    // Fallback de seguridad para el administrador principal si viniera vacío
    if (permisosUsuario.length === 0 && usuario.correo === 'admin@exacontrol.com') {
      permisosUsuario.push(
        'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.desactivar',
        'roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar',
        'estudiantes.ver', 'estudiantes.registrar', 'estudiantes.habilitar',
        'examenes.ver', 'examenes.crear', 'examenes.editar', 'examenes.eliminar'
      );
    }

    const payload = {
      sub: usuario.id,
      nombre: usuario.nombre,
      email: usuario.correo || usuario.email || 'admin@exacontrol.com',
      permisos: permisosUsuario, 
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.correo,
        permisos: permisosUsuario,
      },
    };
  }
}
