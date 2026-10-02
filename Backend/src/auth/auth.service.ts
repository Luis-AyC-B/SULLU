/* eslint-disable */
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { correo: email, deletedAt: null },
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

    if (!usuario.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return usuario;
  }

  async login(usuario: any) {
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

    // Generar nuevo sessionId para la sesión única
    const sessionId = randomUUID();
    
    // Actualizar el sessionId en la base de datos
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { sessionId },
    });

    const payload = {
      sub: usuario.id,
      nombre: usuario.nombre,
      email: usuario.correo,
      permisos: permisosUsuario, 
      sessionId,
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

  async solicitarRecuperacion(email: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { correo: email, deletedAt: null },
    });

    // Respuesta neutra para no revelar si el correo existe
    if (!usuario) {
      return {
        message:
          'Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.',
      };
    }

    // Invalidar tokens anteriores no usados del mismo usuario
    await this.prisma.tokenRecuperacion.updateMany({
      where: { usuarioId: usuario.id, usado: false },
      data: { usado: true },
    });

    const token = randomUUID();
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.tokenRecuperacion.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiraEn,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/recuperar-password?token=${token}`;

    this.mailService
      .enviarRecuperacion(usuario.correo, usuario.nombre ?? '', link)
      .catch(() => {});

    return {
      message:
        'Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.',
    };
  }

  async resetearPassword(token: string, nuevaPassword: string) {
    const registro = await this.prisma.tokenRecuperacion.findUnique({
      where: { token },
    });

    if (!registro || registro.usado || registro.expiraEn < new Date()) {
      throw new BadRequestException(
        'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.',
      );
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { password: passwordHash },
      }),
      this.prisma.tokenRecuperacion.update({
        where: { id: registro.id },
        data: { usado: true },
      }),
    ]);

    return { message: 'Contraseña actualizada exitosamente.' };
  }
}
