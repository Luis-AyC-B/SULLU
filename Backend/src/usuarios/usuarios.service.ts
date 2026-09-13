import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';

export interface CreateUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rol: 'Administrador' | 'Docente';
}

@Injectable()
export class UsuariosService {
  private usuarios = [
    { id: '1', nombre: 'Ana Torres', email: 'docente1@ejemplo.com', rol: 'Docente' },
  ];

  async create(dto: CreateUsuarioDto) {
    const { nombre, email, password, rol } = dto;

    // Validación de campos obligatorios
    if (!nombre || !email || !password || !rol) {
      throw new BadRequestException('Todos los campos son obligatorios');
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El formato del correo es inválido');
    }

    // Validación de email único
    const existe = this.usuarios.find((u) => u.email === email);
    if (existe) {
      throw new ConflictException('El correo ya está en uso');
    }

    // Restricción de rol
    if (rol !== 'Administrador' && rol !== 'Docente') {
      throw new BadRequestException('Rol no permitido');
    }

    const nuevoUsuario = {
      id: Date.now().toString(),
      nombre,
      email,
      rol,
    };

    this.usuarios.push(nuevoUsuario);
    return nuevoUsuario;
  }
}