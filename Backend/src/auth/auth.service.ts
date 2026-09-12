import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, _password: string): Promise<never> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { rol: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    throw new NotImplementedException(
      'Falta una librería de hashing (bcrypt/argon2) para verificar la contraseña',
    );
  }

  login(usuario: { id: number; email: string; rol: { nombre: string } }) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
    };
    return { access_token: this.jwtService.sign(payload) };
  }
}
