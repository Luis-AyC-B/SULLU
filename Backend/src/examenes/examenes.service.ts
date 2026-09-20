import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, EstadoExamen, Prisma } from '@prisma/client';
import { CreateExamenDto } from './dto/create-examen.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { QueryExamenDto } from './dto/query-examen.dto';

const prisma = new PrismaClient();

const EXAMEN_INCLUDE = {
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
};

type ExamenCompleto = Prisma.ExamenGetPayload<{
  include: typeof EXAMEN_INCLUDE;
}>;

type MateriaDocente = {
  id: number;
  nombre: string;
  carreraId: number;
  carreraNombre: string;
  facultadId: number;
  facultadNombre: string;
};

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

  // --- ADAPTADOR SEGURO PARA EL FRONTEND ---
  private formatExamenResponse(e: ExamenCompleto) {
    const cm = e.carrerasMaterias?.[0]?.carrera_materia;
    const cmDirect = e.carrerasMaterias?.[0];
    return {
      ...e,
      normas: e.normasEx ?? '',
      materiaId: cm?.materia?.id ?? cmDirect?.materiaId ?? 0,
      materiaNombre: cm?.materia?.nombre ?? 'Materia',
      carreraId: cm?.carrera?.id ?? cmDirect?.carreraId ?? 0,
      carreraNombre: cm?.carrera?.nombre ?? '',
      facultadId: cm?.carrera?.facultad?.id ?? 0,
      facultadNombre: cm?.carrera?.facultad?.nombre ?? '',
      ambienteId:
        e.reservaAmbiente?.ambiente?.id ?? e.reservaAmbiente?.ambienteId ?? 0,
      ambienteNombre: e.reservaAmbiente?.ambiente?.nombre ?? 'Aula asignada',
      fecha: e.reservaAmbiente?.fecha
        ? String(e.reservaAmbiente.fecha).split('T')[0]
        : '',
      horaInicio: e.reservaAmbiente?.horaIni
        ? (String(e.reservaAmbiente.horaIni).split('T')[1]?.substring(0, 5) ??
          '08:00')
        : '08:00',
      horaFin: e.reservaAmbiente?.horaFin
        ? (String(e.reservaAmbiente.horaFin).split('T')[1]?.substring(0, 5) ??
          '09:30')
        : '09:30',
      fueEditado: Boolean(e.fueEditado),
    };
  }

  // Obtenemos las materias del docente con sus carreras y facultades asociadas de forma segura
  // Obtenemos las materias del docente deduplicadas por ID para evitar conflictos de keys en el frontend
  async getMateriasDocente(usuarioId: unknown): Promise<MateriaDocente[]> {
    const id = Number(usuarioId);

    const alcances = await prisma.usuario_Alcance.findMany({
      where: { usuarioId: id },
      select: { materiaId: true },
    });

    const materiaIds = alcances
      .map((a) => a.materiaId)
      .filter((m): m is number => m !== null);

    if (materiaIds.length === 0) return [];

    const carrerasMaterias = await prisma.carrera_Materia.findMany({
      where: { materiaId: { in: materiaIds } },
      include: {
        materia: true,
        carrera: { include: { facultad: true } },
      },
    });

    // Usamos un Map para garantizar que cada materia ID sea única en la lista
    const uniqueMateriasMap = new Map<number, MateriaDocente>();
    for (const cm of carrerasMaterias) {
      if (!uniqueMateriasMap.has(cm.materia.id)) {
        uniqueMateriasMap.set(cm.materia.id, {
          id: cm.materia.id,
          nombre: cm.materia.nombre,
          carreraId: cm.carreraId,
          carreraNombre: cm.carrera.nombre,
          facultadId: cm.carrera.facultadId ?? 0,
          facultadNombre: cm.carrera.facultad?.nombre ?? '',
        });
      }
    }

    return Array.from(uniqueMateriasMap.values());
  }

  async create(dto: CreateExamenDto, usuarioId: number) {
    const materiaIdNum = Number(dto.materiaId);
    const ambienteIdNum = Number(dto.ambienteId);

    await this.validarAlcanceMateria(usuarioId, materiaIdNum);
    await this.validarDisponibilidadAmbiente(ambienteIdNum);

    const carreraMateria = await prisma.carrera_Materia.findFirst({
      where: { materiaId: materiaIdNum },
      include: { carrera: true },
    });

    if (!carreraMateria) {
      throw new BadRequestException(
        'La materia especificada no está asignada a una carrera válida.',
      );
    }

    const nuevoExamen = await prisma.$transaction(async (tx) => {
      const legacyNormas =
        'normas' in dto ? (dto as Record<string, unknown>).normas : undefined;
      const normasEx =
        typeof dto.normasEx === 'string'
          ? dto.normasEx
          : typeof legacyNormas === 'string'
            ? legacyNormas
            : null;

      const reservaPlaceholder = await tx.reservaAmbiente.create({
        data: {
          ambienteId: ambienteIdNum,
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
          normasEx,
          estadoExamId: 1,
          estado: EstadoExamen.PROGRAMADO,
        },
      });

      await tx.examen_Carrera_Materia.create({
        data: {
          examenId: examen.id,
          carreraId: carreraMateria.carreraId,
          materiaId: materiaIdNum,
        },
      });

      return examen;
    });

    const examenGuardado = await prisma.examen.findUnique({
      where: { id: nuevoExamen.id },
      include: EXAMEN_INCLUDE,
    });

    return this.formatExamenResponse(examenGuardado!);
  }

  async findAll(query: QueryExamenDto, usuarioId: number) {
    const alcances = await prisma.usuario_Alcance.findMany({
      where: { usuarioId },
      select: { materiaId: true },
    });

    const materiasPermitidas = alcances
      .map((a) => a.materiaId)
      .filter((m): m is number => m !== null);

    const materiaIdInt = query.materiaId ? Number(query.materiaId) : undefined;
    const carreraIdInt = query.carreraId ? Number(query.carreraId) : undefined;
    const facultadIdInt = query.facultadId
      ? Number(query.facultadId)
      : undefined;

    const whereClause: Prisma.ExamenWhereInput = {
      estado: { not: EstadoExamen.CANCELADO },
      carrerasMaterias: {
        some: {
          materiaId: materiaIdInt ? materiaIdInt : { in: materiasPermitidas },
          ...(carreraIdInt ? { carreraId: carreraIdInt } : {}),
          ...(facultadIdInt
            ? {
                carrera_materia: {
                  carrera: { facultadId: facultadIdInt },
                },
              }
            : {}),
        },
      },
    };

    const examenes = await prisma.examen.findMany({
      where: whereClause,
      include: EXAMEN_INCLUDE,
      orderBy: { creadoEn: 'desc' },
    });

    return examenes.map((e) => this.formatExamenResponse(e));
  }

  async update(id: number, dto: UpdateExamenDto, usuarioId: number) {
    const examenActual = await prisma.examen.findUnique({
      where: { id },
      include: { carrerasMaterias: true },
    });

    if (!examenActual) throw new NotFoundException('Examen no localizado.');

    const materiaIdNum = dto.materiaId ? Number(dto.materiaId) : undefined;
    const ambienteIdNum = dto.ambienteId ? Number(dto.ambienteId) : undefined;

    if (
      materiaIdNum &&
      materiaIdNum !== examenActual.carrerasMaterias[0]?.materiaId
    ) {
      await this.validarAlcanceMateria(usuarioId, materiaIdNum);

      const carreraMateria = await prisma.carrera_Materia.findFirst({
        where: { materiaId: materiaIdNum },
      });

      if (carreraMateria) {
        await prisma.examen_Carrera_Materia.updateMany({
          where: { examenId: id },
          data: {
            materiaId: materiaIdNum,
            carreraId: carreraMateria.carreraId,
          },
        });
      }
    }

    if (ambienteIdNum) {
      await this.validarDisponibilidadAmbiente(ambienteIdNum, id);

      await prisma.reservaAmbiente.update({
        where: { id: examenActual.reservaAmbienteId },
        data: { ambienteId: ambienteIdNum },
      });
    }

    const dtoLegacy = dto as UpdateExamenDto & { normas?: string | null };

    const examenActualizado = await prisma.examen.update({
      where: { id },
      data: {
        tipoExamen: dto.tipoExamen,
        normasEx: dto.normasEx ?? dtoLegacy.normas ?? null,
        fueEditado: true,
      },
      include: EXAMEN_INCLUDE,
    });

    return this.formatExamenResponse(examenActualizado);
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
      await prisma.ingreso
        .deleteMany({ where: { examenId: id } })
        .catch(() => null);
      await prisma.examen_Carrera_Materia.deleteMany({
        where: { examenId: id },
      });
      await prisma.examen.delete({ where: { id } });
      await prisma.reservaAmbiente.delete({
        where: { id: examen.reservaAmbienteId },
      });
      return {
        message:
          'El registro ha sido eliminado permanentemente (condición < 24 horas).',
        success: true,
      };
    } else {
      await prisma.examen.update({
        where: { id },
        data: { estado: EstadoExamen.CANCELADO },
      });
      return {
        message:
          'El registro ha sido desactivado mediante Soft Delete (condición >= 24 horas).',
        success: true,
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
