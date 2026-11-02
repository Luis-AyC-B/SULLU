import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearExpulsionDto } from './dto/crear-expulsion.dto';
import { combinarBolivia, estadoEfectivo } from '../common/estado-examen.util';

const incluir = { estudiante: true, docente: true } as const;

const nombre = (n: string, a?: string | null) => `${n} ${a ?? ''}`.trim();

type Fila = Prisma.ExpulsionGetPayload<{ include: typeof incluir }>;

@Injectable()
export class ExpulsionesService {
  constructor(private readonly prisma: PrismaService) {}

  private aDto(f: Fila) {
    return {
      id: String(f.id),
      examenId: String(f.examenId),
      fechaHora: f.fechaHora.toISOString(),
      codigoSis: f.estudiante.cod_sis,
      estudianteNombre: nombre(f.estudiante.nombre, f.estudiante.apellido),
      motivo: f.motivo,
      detalle: f.detalle,
      registradoPor: nombre(f.docente.nombre, f.docente.apellido),
    };
  }

  /** Cada palabra escrita debe coincidir con nombre, apellido o código SIS. */
  private filtroBusqueda(texto?: string): Prisma.EstudianteWhereInput[] {
    if (!texto) return [];
    return texto
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({
        OR: [
          { nombre: { contains: t, mode: 'insensitive' as const } },
          { apellido: { contains: t, mode: 'insensitive' as const } },
          { cod_sis: { contains: t } },
        ],
      }));
  }

  /**
   * Docente propietario del examen (obligatorio para registrar).
   * Para listar también se permite al personal de control asignado.
   */
  private async validarAcceso(
    examenId: number,
    usuarioId: number,
    soloDocente: boolean,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: {
        id: true,
        usuarioId: true,
        reservaAmbiente: { include: { horarioFijo: true } },
      },
    });
    if (!examen) {
      throw new NotFoundException({
        code: 'EXAMEN_INVALIDO',
        message: 'El examen no existe',
      });
    }
    if (examen.usuarioId === usuarioId) return examen;

    if (!soloDocente) {
      const asignado = await this.prisma.examenControlador.findUnique({
        where: {
          examenId_colaboradorId: { examenId, colaboradorId: usuarioId },
        },
      });
      if (asignado) return examen;
    }
    throw new ForbiddenException(
      soloDocente
        ? 'Solo el docente del examen puede registrar expulsiones.'
        : 'No tienes permiso sobre este examen.',
    );
  }

  /**
   * Obtiene la lista de exámenes pertenecientes al docente evaluando
   * dinámicamente si están en curso según la fecha y hora actual.
   */
  async listarExamenesParaExpulsion(usuarioId: number) {
    const examenes = await this.prisma.examen.findMany({
      where: {
        usuarioId,
        estado: { notIn: [EstadoExamen.CANCELADO, EstadoExamen.FINALIZADO] },
      },
      include: {
        reservaAmbiente: {
          include: { horarioFijo: true, ambiente: true },
        },
        carrerasMaterias: {
          include: {
            carrera_materia: { include: { materia: true, carrera: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return examenes.map((ex) => {
      const enCurso = estadoEfectivo(ex) === EstadoExamen.EN_CURSO;

      const materiaNombre =
        ex.carrerasMaterias[0]?.carrera_materia?.materia?.nombre ||
        'Examen sin materia';

      return {
        id: String(ex.id),
        nombre: `${materiaNombre} - ${ex.tipoExamen}`,
        ubicacion:
          [
            ex.reservaAmbiente?.ambiente?.nombre,
            ex.carrerasMaterias[0]?.carrera_materia?.carrera?.nombre,
          ]
            .filter(Boolean)
            .join(' · ') || null,
        enCurso,
      };
    });
  }

  /** "Examen en curso" = dentro del horario del examen (hora de Bolivia). */
  private validarEnCurso(reserva: {
    fecha: Date;
    horarioFijo: { horaIni: Date; horaFin: Date };
  }) {
    if (!reserva?.fecha || !reserva?.horarioFijo) return;

    const inicio = combinarBolivia(reserva.fecha, reserva.horarioFijo.horaIni);
    const fin = combinarBolivia(reserva.fecha, reserva.horarioFijo.horaFin);
    const ahora = new Date();

    if (ahora < inicio || ahora > fin) {
      throw new ForbiddenException({
        code: 'EXAMEN_NO_EN_CURSO',
        message: 'El examen no está en curso.',
      });
    }
  }

  /** Estudiantes que ya ingresaron al examen (tabla ingresos). */
  private async idsEstudiantesIngresados(examenId: number): Promise<number[]> {
    const ingresos = await this.prisma.ingreso.findMany({
      where: { examenId },
      select: { estudianteId: true },
      distinct: ['estudianteId'],
    });
    return ingresos.map((i) => i.estudianteId);
  }

  /** CA 1-5: listado + contador del examen. */
  async listar(examenId: number, usuarioId: number, buscar?: string) {
    await this.validarAcceso(examenId, usuarioId, false);

    const [total, filas] = await this.prisma.$transaction([
      this.prisma.expulsion.count({ where: { examenId } }),
      this.prisma.expulsion.findMany({
        where: { examenId, estudiante: { AND: this.filtroBusqueda(buscar) } },
        orderBy: { fechaHora: 'desc' },
        include: incluir,
      }),
    ]);

    return { total, data: filas.map((f) => this.aDto(f)) };
  }

  /** CA 7 y 18: ingresaron al examen y aún no están expulsados. */
  async estudiantesElegibles(examenId: number, usuarioId: number, q?: string) {
    await this.validarAcceso(examenId, usuarioId, true);
    const ids = await this.idsEstudiantesIngresados(examenId);

    const estudiantes = await this.prisma.estudiante.findMany({
      where: {
        id: { in: ids },
        expulsiones: { none: { examenId } },
        AND: this.filtroBusqueda(q),
      },
      orderBy: { nombre: 'asc' },
      take: 10,
    });

    return estudiantes.map((e) => ({
      codigoSis: e.cod_sis,
      nombre: nombre(e.nombre, e.apellido),
    }));
  }

  /** CA 13, 15-17 y escenarios negativos 6-13. */
  async crear(dto: CrearExpulsionDto, usuarioId: number, ip?: string) {
    const examenId = Number(dto.examenId);
    if (!Number.isInteger(examenId)) {
      throw new NotFoundException({
        code: 'EXAMEN_INVALIDO',
        message: 'El examen no es válido',
      });
    }

    const examen = await this.validarAcceso(examenId, usuarioId, true);
    this.validarEnCurso(examen.reservaAmbiente);

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { cod_sis: dto.codigoSis },
    });
    if (!estudiante) {
      throw new NotFoundException({
        code: 'SIS_NO_EXISTE',
        message: 'El código SIS ingresado no existe',
      });
    }

    const ids = await this.idsEstudiantesIngresados(examenId);
    if (!ids.includes(estudiante.id)) {
      throw new BadRequestException({
        code: 'ESTUDIANTE_SIN_INGRESO',
        message: 'El estudiante no registró ingreso en este examen',
      });
    }

    try {
      const creada = await this.prisma.$transaction(async (tx) => {
        const nueva = await tx.expulsion.create({
          data: {
            examenId,
            estudianteId: estudiante.id,
            docenteId: usuarioId,
            motivo: dto.motivo,
            detalle: dto.detalle,
          },
          include: incluir,
        });

        await tx.bitacora_Auditoria.create({
          data: {
            usuarioId,
            accion: 'EXPULSAR_ESTUDIANTE',
            modulo: 'Incidencias',
            tablaAfectada: 'expulsion',
            registroId: nueva.id,
            detallesNuevo: {
              examenId,
              codigoSis: dto.codigoSis,
              motivo: dto.motivo,
            },
            ipOrigen: ip?.slice(0, 45),
          },
        });
        return nueva;
      });
      return this.aDto(creada);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'YA_EXPULSADO',
          message: 'El estudiante ya fue expulsado de este examen',
        });
      }
      throw e;
    }
  }
}
