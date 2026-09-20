import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, EstadoExamen } from '@prisma/client';
import { CreateExamenDto } from './dto/create-examen.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { QueryExamenDto } from './dto/query-examen.dto';

const prisma = new PrismaClient();

@Injectable()
export class ExamenesService {
  getTiposExamen() {
    return [
      'Primer Parcial',
      'Segundo Parcial',
      'Examen Final',
      'Instancia',
      'Mesa de Examen',
    ];
  }

  async getMateriasDocente(usuarioId: number) {
    return prisma.usuario_Alcance.findMany({
      where: { usuarioId },
      include: {
        materia: true,
        carrera: true,
        facultad: true,
      },
    });
  }

  async getAmbientes() {
    return prisma.ambiente.findMany({
      include: {
        tipoAula: true,
        facultad: true,
      },
    });
  }

  async create(dto: CreateExamenDto, usuarioId: number) {
    await this.validarAlcanceMateria(usuarioId, dto.materiaId);
    await this.validarDisponibilidadAmbiente(dto.ambienteId);

    const carreraMateria = await prisma.carrera_Materia.findFirst({
      where: { materiaId: dto.materiaId },
      include: { carrera: true },
    });

    if (!carreraMateria) {
      throw new BadRequestException(
        'La materia especificada no está asignada a una carrera válida.',
      );
    }

    return prisma.$transaction(async (tx) => {
      const reservaPlaceholder = await tx.reservaAmbiente.create({
        data: {
          ambienteId: dto.ambienteId,
          usuarioId: usuarioId,
          fecha: new Date(),
          horaIni: new Date('1970-01-01T08:00:00Z'),
          horaFin: new Date('1970-01-01T10:00:00Z'),
          motivo: `Reserva pendiente de programación temporal: ${dto.tipoExamen}`,
          estadoAulaId: 1,
        },
      });

      const examen = await tx.examen.create({
        data: {
          reservaAmbienteId: reservaPlaceholder.id,
          usuarioId: usuarioId,
          tipoExamen: dto.tipoExamen,
          normasEx: dto.normasEx || null,
          estadoExamId: 1,
          estado: EstadoExamen.PROGRAMADO,
        },
      });

      await tx.examen_Carrera_Materia.create({
        data: {
          examenId: examen.id,
          carreraId: carreraMateria.carreraId,
          materiaId: dto.materiaId,
        },
      });

      return examen;
    });
  }

  async findAll(query: QueryExamenDto, usuarioId: number) {
    const alcances = await prisma.usuario_Alcance.findMany({
      where: { usuarioId },
      select: { materiaId: true },
    });

    const materiasPermitidas = alcances
      .map((a) => a.materiaId)
      .filter(Boolean) as number[];

    const whereClause: import('@prisma/client').Prisma.ExamenWhereInput = {
      estado: { not: EstadoExamen.CANCELADO },
      carrerasMaterias: {
        some: { materiaId: { in: materiasPermitidas } },
      },
    };

    if (query.materiaId) {
      whereClause.carrerasMaterias = {
        some: {
          ...whereClause.carrerasMaterias?.some,
          materiaId: parseInt(query.materiaId),
        },
      };
    }
    if (query.carreraId) {
      whereClause.carrerasMaterias = {
        some: {
          ...whereClause.carrerasMaterias?.some,
          carreraId: parseInt(query.carreraId),
        },
      };
    }
    if (query.facultadId) {
      whereClause.carrerasMaterias = {
        some: {
          ...whereClause.carrerasMaterias?.some,
          carrera_materia: {
            carrera: { facultadId: parseInt(query.facultadId) },
          },
        },
      };
    }

    return prisma.examen.findMany({
      where: whereClause,
      include: {
        reservaAmbiente: { include: { ambiente: true } },
        carrerasMaterias: {
          include: {
            carrera_materia: {
              include: {
                materia: true,
                carrera: { include: { facultad: true } },
              },
            },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }
  async update(id: number, dto: UpdateExamenDto, usuarioId: number) {
    const examenActual = await prisma.examen.findUnique({
      where: { id },
      include: { carrerasMaterias: true },
    });

    if (!examenActual) throw new NotFoundException('Examen no localizado.');

    if (
      dto.materiaId &&
      dto.materiaId !== examenActual.carrerasMaterias[0]?.materiaId
    ) {
      await this.validarAlcanceMateria(usuarioId, dto.materiaId);
    }

    if (dto.ambienteId) {
      await this.validarDisponibilidadAmbiente(dto.ambienteId, id);

      await prisma.reservaAmbiente.update({
        where: { id: examenActual.reservaAmbienteId },
        data: { ambienteId: dto.ambienteId },
      });
    }

    return prisma.examen.update({
      where: { id },
      data: {
        tipoExamen: dto.tipoExamen,
        normasEx: dto.normasEx,
        fueEditado: true,
      },
    });
  }

  async remove(id: number) {
    const examen = await prisma.examen.findUnique({ where: { id } });
    if (!examen) throw new NotFoundException('Examen no localizado.');

    if (
      examen.estado === EstadoExamen.EN_CURSO ||
      examen.estado === EstadoExamen.FINALIZADO
    ) {
      throw new BadRequestException(
        'Exámenes en curso o finalizados no admiten cancelación.',
      );
    }

    const horasTranscurridas =
      (new Date().getTime() - examen.creadoEn.getTime()) / (1000 * 60 * 60);

    if (horasTranscurridas < 24) {
      await prisma.reservaAmbiente.delete({
        where: { id: examen.reservaAmbienteId },
      });
      await prisma.examen.delete({ where: { id } });
      return {
        message:
          'El registro ha sido eliminado permanentemente (condición < 24 horas).',
      };
    } else {
      await prisma.examen.update({
        where: { id },
        data: { estado: EstadoExamen.CANCELADO },
      });
      return {
        message:
          'El registro ha sido desactivado mediante Soft Delete (condición >= 24 horas).',
      };
    }
  }

  private async validarAlcanceMateria(usuarioId: number, materiaId: number) {
    const alcance = await prisma.usuario_Alcance.findFirst({
      where: { usuarioId, materiaId },
    });
    if (!alcance) {
      throw new ForbiddenException(
        'Autorización denegada para gestionar la materia seleccionada.',
      );
    }
  }

  private async validarDisponibilidadAmbiente(
    ambienteId: number,
    excluirExamenId?: number,
  ) {
    const solapamiento = await prisma.examen.findFirst({
      where: {
        reservaAmbiente: { ambienteId },
        estado: { in: [EstadoExamen.PROGRAMADO, EstadoExamen.EN_CURSO] },
        id: excluirExamenId ? { not: excluirExamenId } : undefined,
      },
    });

    if (solapamiento) {
      throw new BadRequestException(
        'El ambiente seleccionado presenta un estado de ocupación activo.',
      );
    }
  }
}
