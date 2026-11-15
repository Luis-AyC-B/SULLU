import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CasoIncidencia, EstadoExamen, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearExpulsionDto } from './dto/crear-expulsion.dto';
import { combinarBolivia, estadoEfectivo } from '../common/estado-examen.util';

const incluir = { estudiante: true, docente: true } as const;

const nombre = (n: string, a?: string | null) => `${n} ${a ?? ''}`.trim();

const normalizar = (str: string) =>
  (str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

type Fila = Prisma.ExpulsionGetPayload<{ include: typeof incluir }>;

export interface ExpulsionResponseDto {
  id: string;
  examenId: string;
  fechaHora: string;
  codigoSis: string;
  estudianteNombre: string;
  caso: string;
  motivo: string;
  detalle: string;
  registradoPor: string;
}

export interface EstudianteElegibleDto {
  codigoSis: string;
  nombre: string;
}

@Injectable()
export class ExpulsionesService {
  constructor(private readonly prisma: PrismaService) {}

  private aDto(f: Fila): ExpulsionResponseDto {
    return {
      id: String(f.id),
      examenId: String(f.examenId),
      fechaHora: f.fechaHora.toISOString(),
      codigoSis: f.estudiante.cod_sis,
      estudianteNombre: nombre(f.estudiante.nombre, f.estudiante.apellido),
      caso: f.caso,
      motivo: f.motivo,
      detalle: f.detalle ?? '',
      registradoPor: nombre(f.docente.nombre, f.docente.apellido),
    };
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
      throw new BadRequestException({
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

  /**
   * Listado de incidencias/expulsiones del examen.
   * Devuelve Array<ExpulsionResponseDto>.
   */
  async listar(
    examenId: number,
    usuarioId: number,
    buscar?: string,
  ): Promise<ExpulsionResponseDto[]> {
    await this.validarAcceso(examenId, usuarioId, false);

    const filas = await this.prisma.expulsion.findMany({
      where: { examenId },
      orderBy: { fechaHora: 'desc' },
      include: incluir,
    });

    const dtoFilas = filas.map((f) => this.aDto(f));

    if (!buscar?.trim()) {
      return dtoFilas;
    }

    const palabras = normalizar(buscar).split(/\s+/).filter(Boolean);
    return dtoFilas.filter((item) => {
      const nombreNorm = normalizar(item.estudianteNombre);
      const sisNorm = normalizar(item.codigoSis);
      return palabras.every(
        (p) => nombreNorm.includes(p) || sisNorm.includes(p),
      );
    });
  }

  /**
   * Búsqueda (GET /examenes/:id/expulsiones/estudiantes?q=):
   * separa q en palabras; todas deben coincidir con nombre, apellido o código SIS;
   * ignora mayúsculas y acentos ("perez" encuentra "Pérez").
   * Devuelve máximo 5 como [{codigoSis, nombre}]. Si q está vacío, devuelve los primeros 5.
   */
  async estudiantesElegibles(
    examenId: number,
    usuarioId: number,
    q?: string,
  ): Promise<EstudianteElegibleDto[]> {
    await this.validarAcceso(examenId, usuarioId, true);
    const ids = await this.idsEstudiantesIngresados(examenId);
    if (ids.length === 0) {
      return [];
    }

    const estudiantes = await this.prisma.estudiante.findMany({
      where: {
        id: { in: ids },
        expulsiones: { none: { examenId } },
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    });

    const palabras = q ? normalizar(q).split(/\s+/).filter(Boolean) : [];

    const filtrados = estudiantes.filter((e) => {
      if (palabras.length === 0) return true;
      const nombreNorm = normalizar(e.nombre);
      const apellidoNorm = normalizar(e.apellido ?? '');
      const sisNorm = normalizar(e.cod_sis);
      const fullNorm = `${nombreNorm} ${apellidoNorm}`.trim();

      return palabras.every(
        (p) =>
          nombreNorm.includes(p) ||
          apellidoNorm.includes(p) ||
          fullNorm.includes(p) ||
          sisNorm.includes(p),
      );
    });

    return filtrados.slice(0, 5).map((e) => ({
      codigoSis: e.cod_sis,
      nombre: nombre(e.nombre, e.apellido),
    }));
  }

  /**
   * Registrar expulsión / incidencia.
   * Devuelve ExpulsionResponseDto.
   */
  async crear(
    dto: CrearExpulsionDto,
    usuarioId: number,
    ip?: string,
  ): Promise<ExpulsionResponseDto> {
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
            caso: dto.caso ?? CasoIncidencia.EXPULSION,
            motivo: dto.motivo,
            detalle: dto.detalle ?? '',
          },
          include: incluir,
        });

        await tx.bitacora_Auditoria.create({
          data: {
            usuarioId,
            accion: 'EXPULSAR_ESTUDIANTE',
            modulo: 'Expulsiones',
            tablaAfectada: 'expulsion',
            registroId: nueva.id,
            detallesNuevo: {
              examenId,
              codigoSis: dto.codigoSis,
              caso: nueva.caso,
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
          code: 'ESTUDIANTE_YA_EXPULSADO',
          message: 'El estudiante ya fue expulsado de este examen',
        });
      }
      throw e;
    }
  }

  /**
   * Bloqueo de reingreso:
   * ForbiddenException si el estudiante tiene una incidencia en ese examen con caso EXPULSION o SUPLANTACION_IDENTIDAD.
   */
  async verificarBloqueoReingreso(
    examenId: number,
    estudianteId: number,
  ): Promise<void> {
    const expulsion = await this.prisma.expulsion.findFirst({
      where: {
        examenId,
        estudianteId,
        caso: {
          in: [CasoIncidencia.EXPULSION, CasoIncidencia.SUPLANTACION_IDENTIDAD],
        },
      },
    });

    if (expulsion) {
      throw new ForbiddenException({
        code: 'ESTUDIANTE_EXPULSADO',
        message:
          'El estudiante fue expulsado de este examen y no puede ingresar nuevamente.',
      });
    }
  }
}
