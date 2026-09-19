import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtSecret } from '../jwt-secret';

export interface JwtPayload {
  sub: number;
  nombre: string;
  email: string;
  permisos: string[]; // <-- Actualizado de 'rol' a 'permisos'
}

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  email: string;
  permisos: string[]; // <-- Actualizado de 'rol' a 'permisos'
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      nombre: payload.nombre,
      email: payload.email,
      permisos: payload.permisos || [], // <-- Mapeo correcto de los permisos
    };
  }
}
