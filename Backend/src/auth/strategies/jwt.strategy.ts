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
  sessionId?: string; // <-- Nuevo campo para single session
}

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  email: string;
  permisos: string[];
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
    });

    // Si el usuario no existe, o si el sessionId del token no coincide con el de la BD, rechazar
    if (
      !usuario ||
      (usuario.sessionId && usuario.sessionId !== payload.sessionId)
    ) {
      throw new UnauthorizedException(
        'Sesión inválida o expirada. Has iniciado sesión en otro dispositivo.',
      );
    }

    return {
      id: payload.sub,
      nombre: payload.nombre,
      email: payload.email,
      permisos: payload.permisos || [],
    };
  }
}
