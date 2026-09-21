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

// Las fechas de Prisma llegan como Date: se formatean con toISOString()
// (String(date) no devuelve formato ISO y rompe el split('T')).
const fechaISO = (d?: Date | null) => (d ? d.toISOString().split('T')[0] : '');
const horaISO = (d?: Date | null, defecto = '') =>
  d ? d.toISOString().substring(11, 16) : defecto;

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
      reservaAmbienteId: e.reservaAmbienteId,
      ambienteId:
        e.reservaAmbiente?.ambiente?.id ?? e.reservaAmbiente?.ambienteId ?? 0,
      ambienteNombre: e.reservaAmbiente?.ambiente?.nombre ?? 'Aula asignada',
      fecha: fechaISO(e.reservaAmbiente?.fecha),
      horaInicio: horaISO(e.reservaAmbiente?.horaIni, '08:00'),
      horaFin: horaISO(e.reservaAmbiente?.horaFin, '09:30'),
      fueEditado: Boolean(e.fueEditado),
      // Alias para que el frontend use siempre "createdAt"
      createdAt: e.creadoEn?.toISOString() ?? new Date().toISOString(),
    };
  }

  // Materias del docente deduplicadas por ID para evitar conflictos de keys en el frontend
  async getMateriasDocente(
    usuarioId: unknown,
    isAdmin = false,
  ): Promise<MateriaDocente[]> {
    const id = Number(usuarioId);

    // Admin: devuelve todas las materias sin filtrar por alcance
    if (isAdmin) {
      const carrerasMaterias = await prisma.carrera_Materia.findMany({
        include: {
          materia: true,
          carrera: { include: { facultad: true } },
        },
      });
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

    const alcances = await prisma.usuario_Alcance.findMany({
      where: { usuarioId: id },
      select: { materiaId: true, carreraId: true, facultadId: true },
    });

    // Solo materia (nivel más específico)
    const materiaIds = alcances
      .filter((a) => a.materiaId !== null)
      .map((a) => a.materiaId as number);

    // Carrera completa: tiene carreraId pero SIN materiaId
    const carreraIds = alcances
      .filter((a) => a.materiaId === null && a.carreraId !== null)
      .map((a) => a.carreraId as number);

    // Facultad completa: SIN carreraId y SIN materiaId
    const facultadIds = alcances
      .filter(
        (a) =>
          a.materiaId === null && a.carreraId === null && a.facultadId !== null,
      )
      .map((a) => a.facultadId as number);

    if (
      materiaIds.length === 0 &&
      carreraIds.length === 0 &&
      facultadIds.length === 0
    ) {
      return [];
    }

    const carrerasMaterias = await prisma.carrera_Materia.findMany({
      where: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        OR: [
          materiaIds.length > 0 ? { materiaId: { in: materiaIds } } : undefined,
          carreraIds.length > 0 ? { carreraId: { in: carreraIds } } : undefined,
          facultadIds.length > 0
            ? { carrera: { facultadId: { in: facultadIds } } }
            : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        materia: true,
        carrera: { include: { facultad: true } },
      },
    });

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
  // Ambientes que el docente tiene reservados: es lo único que ve en el form de aula.
  // Se devuelve una fila por reserva (un mismo ambiente puede tener varias reservas).
  async getMisAmbientes(usuarioId: number, isAdmin = false) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const reservas = await prisma.reservaAmbiente.findMany({
      where: {
        ...(isAdmin ? {} : { usuarioId }), // admin ve todas; docente solo las suyas
        fecha: { gte: hoy },
        examenes: { none: {} },
      },
      include: { ambiente: true },
      orderBy: { fecha: 'asc' },
    });

    return reservas.map((r) => ({
      reservaAmbienteId: r.id,
      ambienteId: r.ambienteId,
      ambienteNombre: r.ambiente?.nombre ?? '',
      fecha: fechaISO(r.fecha),
      horaInicio: horaISO(r.horaIni),
      horaFin: horaISO(r.horaFin),
    }));
  }

  async create(dto: CreateExamenDto, usuarioId: number, isAdmin = false) {
    const materiaIdNum = Number(dto.materiaId);

    if (!isAdmin) {
      await this.validarAlcanceMateria(usuarioId, materiaIdNum);
    }
    const reserva = await this.resolverReservaDelDocente(
      usuarioId,
      dto,
      isAdmin,
    );

    const carreraMateria = await prisma.carrera_Materia.findFirst({
      where: { materiaId: materiaIdNum },
      include: { carrera: true },
    });

    if (!carreraMateria) {
      throw new BadRequestException(
        'La materia especificada no está asignada a una carrera válida.',
      );
    }

    const legacyNormas =
      'normas' in dto ? (dto as Record<string, unknown>).normas : undefined;
    const normasEx =
      typeof dto.normasEx === 'string'
        ? dto.normasEx
        : typeof legacyNormas === 'string'
          ? legacyNormas
          : null;

    const nuevoExamen = await prisma.$transaction(async (tx) => {
      // Ya no se crea una reserva placeholder: el examen se cuelga de una reserva
      // real del docente, y varios exámenes pueden compartir la misma.
      const examen = await tx.examen.create({
        data: {
          reservaAmbienteId: reserva.id,
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

  // Convierte el alcance del usuario (materia / carrera / facultad) en condiciones
  // sobre Examen_Carrera_Materia. Se combinan con OR.
  private async condicionesAlcance(
    usuarioId: number,
  ): Promise<Prisma.Examen_Carrera_MateriaWhereInput[]> {
    const alcances = await prisma.usuario_Alcance.findMany({
      where: { usuarioId },
      select: { materiaId: true, carreraId: true, facultadId: true },
    });

    const materiaIds = alcances
      .filter((a) => a.materiaId !== null)
      .map((a) => a.materiaId as number);

    const carreraIds = alcances
      .filter((a) => a.materiaId === null && a.carreraId !== null)
      .map((a) => a.carreraId as number);

    const facultadIds = alcances
      .filter(
        (a) =>
          a.materiaId === null && a.carreraId === null && a.facultadId !== null,
      )
      .map((a) => a.facultadId as number);

    const condiciones: Prisma.Examen_Carrera_MateriaWhereInput[] = [];
    if (materiaIds.length > 0) {
      condiciones.push({ materiaId: { in: materiaIds } });
    }
    if (carreraIds.length > 0) {
      condiciones.push({ carreraId: { in: carreraIds } });
    }
    if (facultadIds.length > 0) {
      condiciones.push({
        carrera_materia: {
          carrera: { facultadId: { in: facultadIds } },
        },
      });
    }
    return condiciones;
  }

  async findAll(query: QueryExamenDto, usuarioId: number, isAdmin = false) {
    let whereClause: Prisma.ExamenWhereInput;

    if (isAdmin) {
      // Admin ve todos los exámenes no cancelados (sin filtro de alcance)
      const materiaIdInt = query.materiaId
        ? Number(query.materiaId)
        : undefined;
      const carreraIdInt = query.carreraId
        ? Number(query.carreraId)
        : undefined;
      const facultadIdInt = query.facultadId
        ? Number(query.facultadId)
        : undefined;
      whereClause = {
        estado: { not: EstadoExamen.CANCELADO },
        carrerasMaterias: {
          some: {
            AND: [
              ...(materiaIdInt ? [{ materiaId: materiaIdInt }] : []),
              ...(carreraIdInt ? [{ carreraId: carreraIdInt }] : []),
              ...(facultadIdInt
                ? [
                    {
                      carrera_materia: {
                        carrera: { facultadId: facultadIdInt },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      };
    } else {
      const condicionesAlcance = await this.condicionesAlcance(usuarioId);
      if (condicionesAlcance.length === 0) return [];

      const materiaIdInt = query.materiaId
        ? Number(query.materiaId)
        : undefined;
      const carreraIdInt = query.carreraId
        ? Number(query.carreraId)
        : undefined;
      const facultadIdInt = query.facultadId
        ? Number(query.facultadId)
        : undefined;

      whereClause = {
        estado: { not: EstadoExamen.CANCELADO },
        carrerasMaterias: {
          some: {
            AND: [
              { OR: condicionesAlcance },
              ...(materiaIdInt ? [{ materiaId: materiaIdInt }] : []),
              ...(carreraIdInt ? [{ carreraId: carreraIdInt }] : []),
              ...(facultadIdInt
                ? [
                    {
                      carrera_materia: {
                        carrera: { facultadId: facultadIdInt },
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      };
    }

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

    // Cambiar de aula = apuntar el examen a OTRA reserva del docente.
    // Nunca se modifica la reserva en sí: puede estar compartida con otros exámenes.
    let nuevaReservaId: number | undefined;
    if (dto.reservaAmbienteId || dto.ambienteId) {
      const reserva = await this.resolverReservaDelDocente(usuarioId, dto);
      nuevaReservaId = reserva.id;
    }

    const dtoLegacy = dto as UpdateExamenDto & { normas?: string | null };
    const normasNuevas = dto.normasEx ?? dtoLegacy.normas;

    const examenActualizado = await prisma.examen.update({
      where: { id },
      data: {
        tipoExamen: dto.tipoExamen,
        // undefined = no tocar (antes un PATCH sin normas las borraba)
        normasEx: normasNuevas,
        reservaAmbienteId: nuevaReservaId,
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
      // OJO: ya NO se borra la reserva. Es del docente y otros exámenes pueden usarla.
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
    // Reutiliza la misma lógica que el selector del form (materia/carrera/facultad)
    const materias = await this.getMateriasDocente(usuarioId);
    if (!materias.some((m) => m.id === materiaId)) {
      throw new ForbiddenException(
        'Autorización denegada para gestionar la materia seleccionada.',
      );
    }
  }

  // Reemplaza a validarDisponibilidadAmbiente (el bloqueo temporal).
  // La pregunta ya no es "¿el ambiente está libre?" sino "¿esta reserva es del docente?".
  // El choque de horarios entre reservas de distintos docentes se valida al crear la
  // reserva (módulo reserva_ambiente), no al crear el examen.
  private async resolverReservaDelDocente(
    usuarioId: number,
    ref: { reservaAmbienteId?: number; ambienteId?: number },
    isAdmin = false,
  ) {
    const reservaId = ref.reservaAmbienteId
      ? Number(ref.reservaAmbienteId)
      : undefined;
    const ambienteId = ref.ambienteId ? Number(ref.ambienteId) : undefined;

    if (reservaId) {
      const reserva = await prisma.reservaAmbiente.findUnique({
        where: { id: reservaId },
      });
      if (!reserva) {
        throw new ForbiddenException(
          'El ambiente seleccionado no está entre tus reservas.',
        );
      }
      // Admin puede usar cualquier reserva; docente solo las propias
      if (!isAdmin && reserva.usuarioId !== usuarioId) {
        throw new ForbiddenException(
          'El ambiente seleccionado no está entre tus reservas.',
        );
      }
      return reserva;
    }

    if (ambienteId) {
      const where = isAdmin ? { ambienteId } : { usuarioId, ambienteId };
      const reservas = await prisma.reservaAmbiente.findMany({
        where,
        take: 2,
      });
      if (reservas.length === 0) {
        throw new ForbiddenException(
          'El ambiente seleccionado no está entre tus reservas.',
        );
      }
      if (reservas.length > 1) {
        throw new BadRequestException(
          'Hay varias reservas de este ambiente; indica cuál con reservaAmbienteId.',
        );
      }
      return reservas[0];
    }

    throw new BadRequestException(
      'Debes seleccionar uno de tus ambientes reservados.',
    );
  }
}
