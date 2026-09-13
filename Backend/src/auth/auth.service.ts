import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';

export interface LoginDto {
  email?: string;
  password?: string;
}

@Injectable()
export class AuthService {
  // Simulación de base de datos de usuarios registrados
  private usuarios = [
    {
      id: '1',
      email: 'docente@umss.edu.bo',
      passwordHash: 'hash123',
      estado: 'Activo',
      rol: 'Docente',
    },
    {
      id: '2',
      email: 'inactivo@umss.edu.bo',
      passwordHash: 'hash123',
      estado: 'Inactivo',
      rol: 'Docente',
    },
  ];

  async login(loginDto: LoginDto) {
    // Escenario Negativo 2: Campos obligatorios vacíos
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('Todos los campos son obligatorios');
    }

    const usuario = this.usuarios.find((u) => u.email === loginDto.email);

    // Escenario Negativo 1: Credenciales incorrectas (error neutro sin revelar si falló usuario o password)
    if (!usuario || usuario.passwordHash !== loginDto.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Escenario Negativo 3: Usuario inactivo (dado de baja)
    if (usuario.estado === 'Inactivo') {
      throw new UnauthorizedException('El usuario no está habilitado');
    }

    // Escenario Positivo 1: Inicio de sesión exitoso
    return {
      access_token: 'jwt-token-simulado-sullu',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  async solicitarRecuperacionContrasena(email: string) {
    // Escenario Negativo 6: Mensaje neutro para no revelar si el correo existe
    return {
      mensaje: 'Si el correo está registrado, recibirá instrucciones para restablecer su contraseña.',
    };
  }
}