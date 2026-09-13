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
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return usuario;
  }

  login(usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: { nombre: string };
  }) {
    const payload = {
      sub: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol.nombre,
    };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol.nombre,
      },
    };
  }
}
