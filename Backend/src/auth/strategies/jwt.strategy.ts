import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtSecret } from '../jwt-secret';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  nombre: string;
  email: string;
  permisos: string[];
  rol?: string;
  sessionId?: string | null;
  estudianteId?: number;
}

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  email: string;
  permisos: string[];
  rol?: string;
  debeCambiarPassword?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    if (!usuario || usuario.deletedAt !== null) {
      throw new UnauthorizedException(
        'Sesión inválida o cuenta dada de baja.',
      );
    }

    // Exención de sesión única para rol Estudiante consultando la base de datos
    const esEstudiante = usuario.roles?.some(
      (r) => r.rol?.nombre === 'Estudiante',
    );

    if (
      !esEstudiante &&
      usuario.sessionId &&
      usuario.sessionId !== payload.sessionId
    ) {
      throw new UnauthorizedException(
        'Sesión inválida o expirada. Has iniciado sesión en otro dispositivo.',
      );
    }

    const rolNombre = usuario.roles?.[0]?.rol?.nombre || '';

    return {
      id: payload.sub,
      nombre: payload.nombre,
      email: payload.email,
      permisos: payload.permisos || [],
      rol: rolNombre,
      debeCambiarPassword: usuario.debeCambiarPassword,
    };
  }
}
