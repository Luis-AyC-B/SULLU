import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, EstadoReserva, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AmbientesService } from '../ambientes/ambientes.service';
import { CreateReservaDto } from './dto/create-reserva.dto';

const includeReserva = {
  ambiente: { include: { facultad: true } },
  horarioFijo: true,
  examenes: {
    include: {
      carrerasMaterias: {
        include: { carrera_materia: { include: { materia: true } } },
      },
    },
  },
} satisfies Prisma.ReservaAmbienteInclude;
type ReservaCompleta = Prisma.ReservaAmbienteGetPayload<{
  include: typeof includeReserva;
}>;
function response(r: ReservaCompleta) {
  const examen = r.examenes.find((e) => e.estado !== EstadoExamen.CANCELADO);
  return {
    id: r.id,
    ambienteId: r.ambienteId,
    ambienteNombre: r.ambiente.nombre,
    facultad: r.ambiente.facultad?.nombre ?? '',
    fecha: r.fecha.toISOString().slice(0, 10),
    horarioFijoId: r.horarioFijoId,
    periodoNombre: r.horarioFijo.periodoNombre,
    horaIni: r.horarioFijo.horaIni.toISOString().slice(11, 16),
    horaFin: r.horarioFijo.horaFin.toISOString().slice(11, 16),
    estado: r.estado,
    examenAsociado: examen
      ? [
          examen.carrerasMaterias[0]?.carrera_materia.materia.nombre,
          examen.tipoExamen,
        ]
          .filter(Boolean)
          .join(' – ')
      : null,
    tieneExamenAsignado: Boolean(examen),
  };
}
@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ambientes: AmbientesService,
  ) {}
  private async usuarioActivo(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { deletedAt: true },
    });
    if (!usuario || usuario.deletedAt)
      throw new ForbiddenException('Usuario inactivo.');
  }
  async create(dto: CreateReservaDto, usuarioId: number) {
    await this.ambientes.findOne(dto.ambienteId, usuarioId);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM ambientes WHERE id = ${dto.ambienteId} FOR UPDATE`;
        const disponibilidad = await this.ambientes.disponibilidad(
          dto.ambienteId,
          dto.fecha,
          usuarioId,
          tx,
        );
        const periodo = disponibilidad.periodos.find(
          (p) => p.horarioFijoId === dto.horarioFijoId,
        );
        if (!periodo)
          throw new NotFoundException(
            'Periodo institucional no aplicable a la fecha.',
          );
        if (periodo.disponibilidad !== 'LIBRE')
          throw new ConflictException(
            'El periodo ya está reservado. Actualiza la disponibilidad.',
          );
        const reserva = await tx.reservaAmbiente.create({
          data: {
            ambienteId: dto.ambienteId,
            docenteId: usuarioId,
            horarioFijoId: dto.horarioFijoId,
            fecha: new Date(`${dto.fecha}T00:00:00Z`),
            estado: EstadoReserva.RESERVADO,
          },
          include: includeReserva,
        });
        return response(reserva);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 10000,
        timeout: 15000,
      },
    );
  }
  async misReservas(usuarioId: number) {
    await this.usuarioActivo(usuarioId);
    const reservas = await this.prisma.reservaAmbiente.findMany({
      where: { docenteId: usuarioId, estado: EstadoReserva.RESERVADO },
      include: includeReserva,
      orderBy: [{ fecha: 'asc' }, { horarioFijo: { horaIni: 'asc' } }],
    });
    return reservas.map(response);
  }
  async cancelar(id: number, usuarioId: number) {
    await this.usuarioActivo(usuarioId);
    const ref = await this.prisma.reservaAmbiente.findFirst({
      where: { id, docenteId: usuarioId },
    });
    if (!ref) throw new NotFoundException('Reserva no encontrada.');
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM ambientes WHERE id = ${ref.ambienteId} FOR UPDATE`;
        const reserva = await tx.reservaAmbiente.findFirst({
          where: { id, docenteId: usuarioId },
          include: { examenes: true },
        });
        if (!reserva) throw new NotFoundException('Reserva no encontrada.');
        if (reserva.estado === EstadoReserva.CANCELADO) return;
        if (reserva.estado !== EstadoReserva.RESERVADO)
          throw new ConflictException('La reserva ya está finalizada.');
        if (reserva.examenes.some((e) => e.estado !== EstadoExamen.CANCELADO))
          throw new ConflictException(
            'No se puede cancelar: existe un examen vigente asociado.',
          );
        await tx.reservaAmbiente.update({
          where: { id },
          data: { estado: EstadoReserva.CANCELADO },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 10000,
        timeout: 15000,
      },
    );
  }
}
