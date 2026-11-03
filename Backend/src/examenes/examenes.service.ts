import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  EstadoExamen,
  EstadoReserva,
  EstadoAula,
  Prisma,
} from '@prisma/client';
import { fechasPermitidas } from '../ambientes/ambientes.service';
import { CreateExamenDto } from './dto/create-examen.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { QueryExamenDto } from './dto/query-examen.dto';
import { DashboardAsistenciaResponseDto } from './dto/dashboard-asistencia-response.dto';

import { PrismaService } from '../prisma/prisma.service';

const EXAMEN_INCLUDE = {
  reservaAmbiente: { include: { horarioFijo: true, ambiente: true } },
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
  // Agregar esto para contar los estudiantes habilitados e ingresos desde la BD
  _count: {
    select: {
      estudiantes: {
        where: { estado_habilitado: true },
      },
      ingresos: true,
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
  constructor(private readonly prisma: PrismaService) {}
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
      horaInicio: horaISO(e.reservaAmbiente?.horarioFijo?.horaIni, '08:00'),
      horaFin: horaISO(e.reservaAmbiente?.horarioFijo?.horaFin, '09:30'),
      fueEditado: Boolean(e.fueEditado),
      // Alias para que el frontend use siempre "createdAt"
      createdAt: e.creadoEn?.toISOString() ?? new Date().toISOString(),
      // Extraemos el conteo que hizo Prisma
      habilitadosCount: e._count?.estudiantes ?? 0,
      presentesCount: e._count?.ingresos ?? 0,
      ausentesCount: (() => {
        const hab = e._count?.estudiantes ?? 0;
        const pres = e._count?.ingresos ?? 0;
        const estadoCalc = this.calcularEstadoExamen(
          e.estado,
          e.reservaAmbiente?.fecha,
          e.reservaAmbiente?.horarioFijo?.horaIni,
          e.reservaAmbiente?.horarioFijo?.horaFin,
        );
        if (estadoCalc === 'PROXIMO') return null;
        return Math.max(0, hab - pres);
      })(),
      estadoCalculado: this.calcularEstadoExamen(
        e.estado,
        e.reservaAmbiente?.fecha,
        e.reservaAmbiente?.horarioFijo?.horaIni,
        e.reservaAmbiente?.horarioFijo?.horaFin,
      ),
    };
  }

  // --- OBTENER EXÁMENES PÚBLICOS PARA EL CALENDARIO Y PÁGINA DE BIENVENIDA ---
  async getExamenesPublicos() {
    const examenes = await this.prisma.examen.findMany({
      where: {
        estado: { not: EstadoExamen.CANCELADO },
      },
      include: {
        reservaAmbiente: {
          include: {
            horarioFijo: true,
            ambiente: {
              include: {
                facultad: true,
              },
            },
          },
        },
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
        carrerasMaterias: {
          include: {
            carrera_materia: {
              include: {
                materia: true,
                carrera: {
                  include: {
                    facultad: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { reservaAmbiente: { fecha: 'asc' } },
        { reservaAmbiente: { horarioFijo: { horaIni: 'asc' } } },
      ],
    });

    return examenes.map((e) => {
      const cm = e.carrerasMaterias?.[0]?.carrera_materia;
      const cmDirect = e.carrerasMaterias?.[0];
      const docenteNombre = e.responsable
        ? `${e.responsable.nombre} ${e.responsable.apellido ?? ''}`.trim()
        : 'Docente asignado';

      return {
        id: e.id,
        tipoExamen: e.tipoExamen || 'Examen programado',
        normas: e.normasEx ?? '',
        materiaId: cm?.materia?.id ?? cmDirect?.materiaId ?? 0,
        materiaNombre: cm?.materia?.nombre ?? 'Materia general',
        carreraId: cm?.carrera?.id ?? cmDirect?.carreraId ?? 0,
        carreraNombre: cm?.carrera?.nombre ?? 'Carrera no especificada',
        facultadId:
          cm?.carrera?.facultad?.id ??
          e.reservaAmbiente?.ambiente?.facultad?.id ??
          0,
        facultadNombre:
          cm?.carrera?.facultad?.nombre ??
          e.reservaAmbiente?.ambiente?.facultad?.nombre ??
          'Facultad de Ciencias y Tecnología (FCyT)',
        docente: docenteNombre,
        reservaAmbienteId: e.reservaAmbienteId,
        ambienteId: e.reservaAmbiente?.ambiente?.id ?? 0,
        ambienteNombre: e.reservaAmbiente?.ambiente?.nombre ?? 'Aula asignada',
        fecha: fechaISO(e.reservaAmbiente?.fecha),
        horaInicio: horaISO(e.reservaAmbiente?.horarioFijo?.horaIni, '08:00'),
        horaFin: horaISO(e.reservaAmbiente?.horarioFijo?.horaFin, '09:30'),
        estado: e.estado,
      };
    });
  }

  // Materias del docente deduplicadas por ID para evitar conflictos de keys en el frontend
  async getMateriasDocente(
    usuarioId: unknown,
    isAdmin = false,
  ): Promise<MateriaDocente[]> {
    const id = Number(usuarioId);

    // Admin: devuelve todas las materias sin filtrar por alcance
    if (isAdmin) {
      const carrerasMaterias = await this.prisma.carrera_Materia.findMany({
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

    const alcances = await this.prisma.usuario_Alcance.findMany({
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

    const carrerasMaterias = await this.prisma.carrera_Materia.findMany({
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
    const hoy = new Date(`${fechasPermitidas().fechaMin}T00:00:00Z`);

    const reservas = await this.prisma.reservaAmbiente.findMany({
      where: {
        docenteId: usuarioId,
        estado: EstadoReserva.RESERVADO,
        ambiente: { estadoAula: EstadoAula.DISPONIBLE },
        fecha: { gte: hoy },
        examenes: { none: {} },
      },
      include: { horarioFijo: true, ambiente: true },
      orderBy: { fecha: 'asc' },
    });

    return reservas.map((r) => ({
      reservaAmbienteId: r.id,
      ambienteId: r.ambienteId,
      ambienteNombre: r.ambiente?.nombre ?? '',
      fecha: fechaISO(r.fecha),
      horaInicio: horaISO(r.horarioFijo?.horaIni),
      horaFin: horaISO(r.horarioFijo?.horaFin),
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

    const carreraMateria = await this.prisma.carrera_Materia.findFirst({
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

    const nuevoExamen = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ambientes WHERE id = ${reserva.ambienteId} FOR UPDATE`;
      await this.validarReservaVigente(tx, reserva.id, usuarioId);
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

    const examenGuardado = await this.prisma.examen.findUnique({
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
    const alcances = await this.prisma.usuario_Alcance.findMany({
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
        usuarioId,
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

    const examenes = await this.prisma.examen.findMany({
      where: whereClause,
      include: EXAMEN_INCLUDE,
      orderBy: { creadoEn: 'desc' },
    });

    return examenes.map((e) => this.formatExamenResponse(e));
  }

  async update(id: number, dto: UpdateExamenDto, usuarioId: number) {
    const examenActual = await this.prisma.examen.findUnique({
      where: { id },
      include: { carrerasMaterias: true },
    });

    if (!examenActual) throw new NotFoundException('Examen no localizado.');
    if (examenActual.usuarioId !== usuarioId)
      throw new ForbiddenException(
        'El examen no pertenece al usuario autenticado.',
      );

    const materiaIdNum = dto.materiaId ? Number(dto.materiaId) : undefined;

    if (
      materiaIdNum &&
      materiaIdNum !== examenActual.carrerasMaterias[0]?.materiaId
    ) {
      await this.validarAlcanceMateria(usuarioId, materiaIdNum);

      const carreraMateria = await this.prisma.carrera_Materia.findFirst({
        where: { materiaId: materiaIdNum },
      });

      if (!carreraMateria)
        throw new BadRequestException('Materia sin carrera válida.');
    }

    // Cambiar de aula = apuntar el examen a OTRA reserva del docente.
    // La reserva permanece intacta; solo cambia la asociación del examen.
    let nuevaReservaId: number | undefined;
    if (dto.reservaAmbienteId || dto.ambienteId) {
      const reserva = await this.resolverReservaDelDocente(usuarioId, dto);
      nuevaReservaId = reserva.id;
    }

    const dtoLegacy = dto as UpdateExamenDto & { normas?: string | null };
    const normasNuevas = dto.normasEx ?? dtoLegacy.normas;

    const examenActualizado = await this.prisma.$transaction(async (tx) => {
      const reservas = await tx.reservaAmbiente.findMany({
        where: {
          id: {
            in: [
              examenActual.reservaAmbienteId,
              ...(nuevaReservaId ? [nuevaReservaId] : []),
            ],
          },
        },
      });
      for (const ambienteId of [
        ...new Set(reservas.map((r) => r.ambienteId)),
      ].sort((a, b) => a - b)) {
        await tx.$queryRaw`SELECT id FROM ambientes WHERE id = ${ambienteId} FOR UPDATE`;
      }
      const actual = await tx.examen.findUnique({ where: { id } });
      if (
        !actual ||
        actual.usuarioId !== usuarioId ||
        actual.reservaAmbienteId !== examenActual.reservaAmbienteId
      )
        throw new ConflictException(
          'El examen cambió. Actualiza la información.',
        );
      if (nuevaReservaId)
        await this.validarReservaVigente(tx, nuevaReservaId, usuarioId, id);
      if (
        materiaIdNum &&
        materiaIdNum !== examenActual.carrerasMaterias[0]?.materiaId
      ) {
        const cm = await tx.carrera_Materia.findFirst({
          where: { materiaId: materiaIdNum },
        });
        if (!cm) throw new BadRequestException('Materia sin carrera válida.');
        await tx.examen_Carrera_Materia.updateMany({
          where: { examenId: id },
          data: { materiaId: materiaIdNum, carreraId: cm.carreraId },
        });
      }
      return tx.examen.update({
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
    });

    return this.formatExamenResponse(examenActualizado);
  }

  async remove(id: number, usuarioId: number) {
    const examen = await this.prisma.examen.findUnique({ where: { id } });
    if (!examen) throw new NotFoundException('Examen no localizado.');
    if (examen.usuarioId !== usuarioId)
      throw new ForbiddenException(
        'El examen no pertenece al usuario autenticado.',
      );

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
      await this.prisma.ingreso
        .deleteMany({ where: { examenId: id } })
        .catch(() => null);
      await this.prisma.examen_Carrera_Materia.deleteMany({
        where: { examenId: id },
      });
      await this.prisma.examen.delete({ where: { id } });
      // OJO: ya NO se borra la reserva. Es del docente y otros exámenes pueden usarla.
      return {
        message:
          'El registro ha sido eliminado permanentemente (condición < 24 horas).',
        success: true,
      };
    } else {
      await this.prisma.examen.update({
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
      const reserva = await this.prisma.reservaAmbiente.findUnique({
        where: { id: reservaId },
      });
      if (!reserva) {
        throw new ForbiddenException(
          'El ambiente seleccionado no está entre tus reservas.',
        );
      }
      // Admin puede usar cualquier reserva; docente solo las propias
      if (reserva.docenteId !== usuarioId) {
        throw new ForbiddenException(
          'El ambiente seleccionado no está entre tus reservas.',
        );
      }
      return reserva;
    }

    if (ambienteId) {
      const where = {
        docenteId: usuarioId,
        ambienteId,
        estado: EstadoReserva.RESERVADO,
        fecha: { gte: new Date(`${fechasPermitidas().fechaMin}T00:00:00Z`) },
        examenes: { none: {} },
      };
      const reservas = await this.prisma.reservaAmbiente.findMany({
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
  private async validarReservaVigente(
    tx: Prisma.TransactionClient,
    id: number,
    usuarioId: number,
    examenId?: number,
  ) {
    const reserva = await tx.reservaAmbiente.findUnique({
      where: { id },
      include: { ambiente: true, examenes: true },
    });
    if (!reserva || reserva.docenteId !== usuarioId)
      throw new ForbiddenException(
        'La reserva no pertenece al usuario autenticado.',
      );
    if (
      reserva.estado !== EstadoReserva.RESERVADO ||
      reserva.ambiente.estadoAula !== EstadoAula.DISPONIBLE ||
      reserva.fecha.toISOString().slice(0, 10) < fechasPermitidas().fechaMin
    )
      throw new ConflictException(
        'La reserva no está vigente o el ambiente no está habilitado.',
      );
    if (reserva.examenes.some((e) => e.id !== examenId))
      throw new ConflictException('La reserva ya tiene un examen asociado.');
  }
  /**
   * HU16: Calcula el estado dinámico del examen según la fecha y horario fijo asignado (Bolivia UTC-4).
   */
  calcularEstadoExamen(
    estadoExamen: EstadoExamen,
    fecha?: Date | null,
    horaIni?: Date | null,
    horaFin?: Date | null,
  ): 'EN_CURSO' | 'PROXIMO' | 'FINALIZADO' | 'CANCELADO' {
    if (estadoExamen === EstadoExamen.CANCELADO) {
      return 'CANCELADO';
    }
    if (estadoExamen === EstadoExamen.FINALIZADO) {
      return 'FINALIZADO';
    }

    if (!fecha) {
      return 'PROXIMO';
    }

    const ahora = new Date();
    const hoyYMD = ahora.toLocaleDateString('en-CA', {
      timeZone: 'America/La_Paz',
    });
    const fechaYMD = new Date(fecha).toISOString().split('T')[0];

    if (fechaYMD > hoyYMD) {
      return 'PROXIMO';
    }
    if (fechaYMD < hoyYMD) {
      return 'FINALIZADO';
    }

    // Mismo día: evaluar horas si existen
    if (horaIni) {
      const horaStr = ahora.toLocaleTimeString('en-US', {
        timeZone: 'America/La_Paz',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const [h, m] = horaStr.split(':').map(Number);
      const ahoraMinutos = h * 60 + m;

      const iniMinutos = horaIni.getUTCHours() * 60 + horaIni.getUTCMinutes();

      if (ahoraMinutos < iniMinutos) {
        return 'PROXIMO';
      }

      if (horaFin) {
        const finMinutos = horaFin.getUTCHours() * 60 + horaFin.getUTCMinutes();
        if (ahoraMinutos > finMinutos) {
          return 'FINALIZADO';
        }
      }
    }

    return 'EN_CURSO';
  }

  /**
   * HU16: Obtiene las métricas de asistencia en tiempo real del examen para el dashboard docente.
   */
  async getDashboardAsistencia(
    id: number,
    usuarioId: number,
    isAdmin = false,
  ): Promise<DashboardAsistenciaResponseDto> {
    const examen = await this.prisma.examen.findUnique({
      where: { id },
      include: {
        reservaAmbiente: {
          include: {
            horarioFijo: true,
            ambiente: true,
          },
        },
        responsable: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
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
    });

    if (!examen) {
      throw new NotFoundException('Examen no localizado.');
    }

    if (!isAdmin && examen.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'No tienes permiso para ver el dashboard de asistencia de este examen.',
      );
    }

    const cm = examen.carrerasMaterias?.[0]?.carrera_materia;
    const resAmb = examen.reservaAmbiente;
    const horFijo = resAmb?.horarioFijo;

    const fechaDate = resAmb?.fecha ? new Date(resAmb.fecha) : null;
    const horaIni = horFijo?.horaIni ? new Date(horFijo.horaIni) : null;
    const horaFin = horFijo?.horaFin ? new Date(horFijo.horaFin) : null;

    const estado = this.calcularEstadoExamen(
      examen.estado,
      fechaDate,
      horaIni,
      horaFin,
    );

    // 1. Estudiantes habilitados para este examen
    const habilitados = await this.prisma.examen_Estudiante.count({
      where: {
        examenId: id,
        estado_habilitado: true,
      },
    });

    // 2. Estudiantes presentes (habilitados que ya tienen al menos un ingreso registrado)
    const presentes = await this.prisma.examen_Estudiante.count({
      where: {
        examenId: id,
        estado_habilitado: true,
        estudiante: {
          ingresos: {
            some: { examenId: id },
          },
        },
      },
    });

    // 3. Ausentes (Criterio 3 y 13: si aún no inicia el examen, ausentes es null y flag activo)
    const examenAunNoInicia = estado === 'PROXIMO';
    const ausentes = examenAunNoInicia
      ? null
      : Math.max(0, habilitados - presentes);

    // 4. Porcentajes (Criterio 12: con 0 habilitados, porcentajes en 0% sin división por cero ni NaN)
    const porcentajePresentes =
      habilitados > 0 ? Math.round((presentes / habilitados) * 100) : 0;
    const porcentajeAusentes =
      habilitados > 0 && ausentes !== null
        ? Math.round((ausentes / habilitados) * 100)
        : 0;

    const horaInicioStr = horaIni ? horaISO(horaIni, '08:00') : '08:00';
    const horaFinStr = horaFin ? horaISO(horaFin, '09:30') : '09:30';

    return {
      examenId: examen.id,
      materia: cm?.materia?.nombre ?? 'Materia general',
      tipoExamen: examen.tipoExamen ?? 'Examen programado',
      carrera: cm?.carrera?.nombre ?? 'Carrera no especificada',
      ambiente: resAmb?.ambiente?.nombre ?? 'Aula asignada',
      fecha: fechaISO(fechaDate),
      horario: `${horaInicioStr} - ${horaFinStr}`,
      docente: examen.responsable
        ? `${examen.responsable.nombre} ${examen.responsable.apellido ?? ''}`.trim()
        : 'Docente no asignado',
      estado,
      habilitados,
      presentes,
      ausentes,
      porcentajePresentes,
      porcentajeAusentes,
      examenAunNoInicia,
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
