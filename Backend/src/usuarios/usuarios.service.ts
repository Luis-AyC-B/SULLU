/* eslint-disable */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateAlcanceDto } from './dto/update-alcance.dto';
import { PrismaService } from '../prisma/prisma.service';

import { MailService } from '../mail/mail.service';

type AlcanceInput = {
  facultadId: number;
  carreraId?: number | null;
  materiaId?: number | null;
};

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Normaliza los alcances recibidos:
   * - carreraId / materiaId en 0, undefined o null => null
   *   (sin carrera = toda la facultad; sin materia = toda la carrera)
   * - una materia requiere carrera
   * - elimina alcances duplicados
   */
  private normalizarAlcances(alcances: AlcanceInput[] = []) {
    const vistos = new Set<string>();
    const result: {
      facultadId: number;
      carreraId: number | null;
      materiaId: number | null;
    }[] = [];

    for (const a of alcances) {
      const facultadId = Number(a.facultadId);
      const carreraId = Number(a.carreraId) || null;
      const materiaId = Number(a.materiaId) || null;

      if (!facultadId) {
        throw new BadRequestException('Cada alcance requiere una facultad');
      }
      if (materiaId && !carreraId) {
        throw new BadRequestException(
          'Para asignar una materia debes indicar la carrera',
        );
      }

      const key = `${facultadId}-${carreraId}-${materiaId}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      result.push({ facultadId, carreraId, materiaId });
    }

    return result;
  }

  async getCatalogosAcademicos() {
    const [facultades, carreras, materias] = await Promise.all([
      this.prisma.facultad.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.carrera.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.materia.findMany({
        orderBy: { nombre: 'asc' },
        include: { carreras: { select: { carreraId: true } } },
      }),
    ]);

    return {
      facultades,
      carreras,
      materias: materias.map(({ carreras: rel, ...m }) => ({
        ...m,
        carreraIds: rel.map((c) => c.carreraId),
      })),
    };
  }

  async create(dto: CreateUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });
    if (existe) {
      throw new ConflictException('Ya existe un usuario con este correo');
    }

    const alcances = this.normalizarAlcances(dto.alcances);

    const rawPassword = dto.password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
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
            rolId: Number(rolId),
          })),
        });
      }

      if (alcances.length > 0) {
        await tx.usuario_Alcance.createMany({
          data: alcances.map((a) => ({
            usuarioId: usuario.id,
            ...a,
          })),
        });
      }

      return { usuario, reactivado: false };
    });

    // Enviar correo sin bloquear la respuesta si falla
    this.mailService.enviarCredenciales(dto.correo, rawPassword, dto.nombre).catch(() => {});

    return result;
  }

  async findAll(page = 1, limit = 10, search?: string, rolId?: number) {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
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
          alcances: { include: { facultad: true, carrera: true, materia: true } },
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

    if (!usuario || usuario.deletedAt !== null) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe || existe.deletedAt !== null) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { rolesIds, ...dataToUpdate } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (rolesIds) {
        await tx.usuario_Rol.deleteMany({ where: { usuarioId: id } });
        if (rolesIds.length > 0) {
          await tx.usuario_Rol.createMany({
            data: rolesIds.map((rolId) => ({
              usuarioId: id,
              rolId: Number(rolId),
            })),
          });
        }
      }

      return tx.usuario.update({
        where: { id },
        data: dataToUpdate,
      });
    });
  }

  async updatePassword(id: number, dto: UpdatePasswordDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe || existe.deletedAt !== null) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { password: passwordHash },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async remove(id: number) {
    const existe = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        examenes: true,
        cargasEstudiantes: true,
        ingresos: true,
      },
    });

    if (!existe || existe.deletedAt !== null) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      existe.examenes.length > 0 ||
      existe.cargasEstudiantes.length > 0 ||
      existe.ingresos.length > 0
    ) {
      throw new BadRequestException(
        'No se puede eliminar el usuario porque compromete la integridad histórica (tiene exámenes, cargas o ingresos).',
      );
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateAlcance(id: number, dto: UpdateAlcanceDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existe || existe.deletedAt !== null) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Se valida antes de la transacción: si falla, no se borran los alcances anteriores
    const alcances = this.normalizarAlcances(dto.alcances);

    return this.prisma.$transaction(async (tx) => {
      // Eliminar los alcances anteriores
      await tx.usuario_Alcance.deleteMany({
        where: { usuarioId: id },
      });

      // Crear los nuevos
      if (alcances.length > 0) {
        await tx.usuario_Alcance.createMany({
          data: alcances.map((a) => ({
            usuarioId: id,
            ...a,
          })),
        });
      }

      return { message: 'Alcances actualizados correctamente' };
    });
  }
}