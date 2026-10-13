import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAula, EstadoReserva, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROL_ADMINISTRADOR_ID } from '../usuarios/usuarios.constants';

export function fechasPermitidas(now = new Date()) {
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const inicio = new Date(`${hoy}T00:00:00Z`);
  const fin = new Date(inicio);
  fin.setUTCDate(1);
  fin.setUTCMonth(fin.getUTCMonth() + 1);
  const ultimo = new Date(
    Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() + 1, 0),
  ).getUTCDate();
  fin.setUTCDate(Math.min(inicio.getUTCDate(), ultimo));
  return { fechaMin: hoy, fechaMax: fin.toISOString().slice(0, 10) };
}
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const hora = (d: Date) => d.toISOString().slice(11, 16);
const incluir = {
  facultad: { select: { id: true, nombre: true } },
  tipoAula: { select: { id: true, nombre: true } },
};
export function ambienteResponse(a: {
  id: number;
  nombre: string;
  capacidad: number;
  facultadId: number | null;
  tipoAulaId: number | null;
  estadoAula: EstadoAula;
  facultad: { nombre: string } | null;
  tipoAula: { nombre: string } | null;
}) {
  return {
    id: a.id,
    nombre: a.nombre,
    capacidad: a.capacidad,
    facultadId: a.facultadId ?? undefined,
    tipoAulaId: a.tipoAulaId ?? undefined,
    facultad: a.facultad?.nombre ?? '',
    tipoAula: a.tipoAula?.nombre ?? '',
    estado:
      a.estadoAula === EstadoAula.DISPONIBLE
        ? 'HABILITADO'
        : a.estadoAula === EstadoAula.EN_REMODELACION
          ? 'EN_REMODELACION'
          : 'INHABILITADO',
  };
}

@Injectable()
export class AmbientesService {
  constructor(private readonly prisma: PrismaService) {}

  private async alcance(
    usuarioId: number,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<Prisma.AmbienteWhereInput> {
    const usuario = await db.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        deletedAt: true,
        roles: { where: { rol: { deletedAt: null } }, select: { rolId: true } },
        alcances: {
          include: {
            carrera: true,
            materia: { include: { carreras: { include: { carrera: true } } } },
          },
        },
      },
    });
    if (!usuario || usuario.deletedAt)
      throw new ForbiddenException('Usuario inactivo.');
    if (usuario.roles.some((r) => r.rolId === ROL_ADMINISTRADOR_ID)) return {};
    const facultades = usuario.alcances.flatMap((a) =>
      a.facultadId
        ? [a.facultadId]
        : a.carrera
          ? [a.carrera.facultadId]
          : (a.materia?.carreras.map((c) => c.carrera.facultadId) ?? []),
    );
    return { facultadId: { in: [...new Set(facultades)] } };
  }
  async findAll(usuarioId: number) {
    return this.prisma.ambiente.findMany({
      where: await this.alcance(usuarioId),
      include: incluir,
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    });
  }
  async findOne(
    id: number,
    usuarioId: number,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    if (!Number.isInteger(id) || id <= 0)
      throw new BadRequestException(
        'El identificador debe ser un entero positivo.',
      );
    const ambiente = await db.ambiente.findFirst({
      where: { AND: [{ id }, await this.alcance(usuarioId, db)] },
      include: incluir,
    });
    if (!ambiente)
      throw new NotFoundException(
        'Ambiente no encontrado o fuera de tu alcance.',
      );
    return ambiente;
  }
  async disponibilidad(
    id: number,
    fecha: string,
    usuarioId: number,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const limites = fechasPermitidas();
    const date = new Date(`${fecha}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== fecha ||
      fecha < limites.fechaMin ||
      fecha > limites.fechaMax
    )
      throw new BadRequestException(
        'La fecha debe estar entre hoy y un mes adelante.',
      );
    const ambiente = await this.findOne(id, usuarioId, db);
    if (ambiente.estadoAula !== EstadoAula.DISPONIBLE)
      throw new ConflictException(
        'El ambiente no está habilitado para consultar disponibilidad.',
      );
    const [horarios, reservas] = await Promise.all([
      db.horarioFijo.findMany({ orderBy: [{ horaIni: 'asc' }, { id: 'asc' }] }),
      db.reservaAmbiente.findMany({
        where: { ambienteId: id, fecha: date, estado: EstadoReserva.RESERVADO },
        include: { horarioFijo: true },
      }),
    ]);
    const dia = [
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
    ][date.getUTCDay()];
    return {
      ambienteId: id,
      fecha,
      ...limites,
      periodos: horarios
        .filter((h) => h.diaSemana === null || normalizar(h.diaSemana) === dia)
        .map((h) => ({
          horarioFijoId: h.id,
          periodoNombre: h.periodoNombre,
          horaIni: hora(h.horaIni),
          horaFin: hora(h.horaFin),
          disponibilidad: reservas.some(
            (r) =>
              h.horaIni < r.horarioFijo.horaFin &&
              h.horaFin > r.horarioFijo.horaIni,
          )
            ? ('RESERVADO' as const)
            : ('LIBRE' as const),
        })),
    };
  }
  async updateEstado(
    id: number,
    estado:
      | 'HABILITADO'
      | 'DISPONIBLE'
      | 'EN_REMODELACION'
      | 'INHABILITADO'
      | 'DESHABILITADO',
    usuarioId: number,
  ) {
    await this.findOne(id, usuarioId);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM ambientes WHERE id = ${id} FOR UPDATE`;
        await this.findOne(id, usuarioId, tx);
        const estadoAula =
          estado === 'HABILITADO' || estado === 'DISPONIBLE'
            ? EstadoAula.DISPONIBLE
            : estado === 'EN_REMODELACION'
              ? EstadoAula.EN_REMODELACION
              : EstadoAula.INHABILITADO;
        if (
          estadoAula !== EstadoAula.DISPONIBLE &&
          (await tx.reservaAmbiente.count({
            where: {
              ambienteId: id,
              estado: EstadoReserva.RESERVADO,
              fecha: {
                gte: new Date(`${fechasPermitidas().fechaMin}T00:00:00Z`),
              },
            },
          }))
        ) {
          throw new ConflictException(
            'No se puede inhabilitar el ambiente: tiene reservas vigentes.',
          );
        }
        return tx.ambiente.update({
          where: { id },
          data: { estadoAula },
          include: incluir,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
