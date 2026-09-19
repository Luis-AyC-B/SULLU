/* eslint-disable */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });
    if (existe) {
      throw new ConflictException('Ya existe un usuario con este correo');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: dto.nombre,
          apellido: dto.apellido,
          correo: dto.correo,
          telefono: dto.telefono,
          password: passwordHash,
        },
      });

      if (dto.rolesIds && dto.rolesIds.length > 0) {
        await tx.usuario_Rol.createMany({
          data: dto.rolesIds.map((rolId) => ({
            usuarioId: usuario.id,
            rolId,
          })),
        });
      }

      return usuario;
    });
  }

  async findAll(page = 1, limit = 10, search?: string, rolId?: number) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { correo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (rolId) {
      where.roles = { some: { rolId: Number(rolId) } };
    }

    const [total, data] = await Promise.all([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          roles: { include: { rol: true } },
        },
      }),
    ]);

    return { total, page: Number(page), limit: Number(limit), data };
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        roles: { include: { rol: true } },
        alcances: { include: { facultad: true, carrera: true, materia: true } },
      },
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuario.update({
      where: { id },
      data: dto,
    });
  }
}
