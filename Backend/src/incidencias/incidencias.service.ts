import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';

const incluir = {
  estudiante: true,
  controlador: true,
} as const;

// Para armar el nombre del examen ("Materia – Tipo") en el selector.
const incluirNombre = {
  reservaAmbiente: true,
  carrerasMaterias: {
    include: { carrera_materia: { include: { materia: true } } },
  },
} as const;

type Fila = {
  id: number;
  examenId: number;
  fechaHora: Date;
  descripcion: string | null;
  tipoIncidencia: string;
  codSisIngresado: string | null;
  nombreReferencial: string | null;
  estudiante: {
    cod_sis: string;
    nombre: string;
    apellido: string | null;
  } | null;
  controlador: { nombre: string; apellido: string | null };
};

const nombre = (n: string, a?: string | null) => `${n} ${a ?? ''}`.trim();

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  private aDto(f: Fila) {
    return {
      id: String(f.id),
      examenId: String(f.examenId),
      fechaHora: f.fechaHora.toISOString(),
      codigoSis: f.estudiante?.cod_sis ?? f.codSisIngresado ?? '',
      estudianteNombre: f.estudiante
        ? nombre(f.estudiante.nombre, f.estudiante.apellido)
        : (f.nombreReferencial ?? ''),
      motivo: f.tipoIncidencia,
      observaciones: f.descripcion,
      registradoPor: nombre(f.controlador.nombre, f.controlador.apellido),
    };
  }

  private nombreExamen(ex: {
    tipoExamen: string;
    carrerasMaterias: { carrera_materia: { materia: { nombre: string } } }[];
  }) {
    const materia =
      ex.carrerasMaterias[0]?.carrera_materia.materia.nombre ?? 'Examen';
    return `${materia} – ${ex.tipoExamen}`;
  }

  /**
   * Exámenes sobre los que el usuario puede ver incidencias: los propios
   * (Docente) y los que tiene asignados (Personal de control). Es el mismo
   * criterio de acceso que validarAcceso. El del día va primero.
   */
  async examenesDelUsuario(usuarioId: number) {
    const [propios, asignados] = await Promise.all([
      this.prisma.examen.findMany({
        where: { usuarioId },
        include: incluirNombre,
      }),
      this.prisma.examenControlador.findMany({
        where: { colaboradorId: usuarioId },
        include: { examen: { include: incluirNombre } },
      }),
    ]);

    const todos = [...propios, ...asignados.map((a) => a.examen)];
    const unicos = new Map(todos.map((ex) => [ex.id, ex] as const));
    const hoy = new Date().toISOString().slice(0, 10);

    return [...unicos.values()]
      .map((ex) => ({
        id: ex.id,
        nombre: this.nombreExamen(ex),
        fecha: ex.reservaAmbiente.fecha.toISOString().slice(0, 10),
      }))
      .sort((a, b) => {
        const ra = a.fecha === hoy ? 0 : 1;
        const rb = b.fecha === hoy ? 0 : 1;
        return ra - rb || a.fecha.localeCompare(b.fecha);
      });
  }

  /** Control: examen asignado. Docente: examen propio. Devuelve el examen con su horario. */
  private async validarAcceso(examenId: number, usuarioId: number) {
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
    const asignado = await this.prisma.examenControlador.findUnique({
      where: { examenId_colaboradorId: { examenId, colaboradorId: usuarioId } },
    });
    if (!asignado) {
      throw new ForbiddenException('No tienes permiso sobre este examen.');
    }
    return examen;
  }

  /** Solo se puede registrar durante el horario del examen. */
  private validarHorario(reserva: {
    fecha: Date;
    horarioFijo: { horaIni: Date; horaFin: Date };
  }) {
    const inicio = this.combinar(reserva.fecha, reserva.horarioFijo.horaIni);
    const fin = this.combinar(reserva.fecha, reserva.horarioFijo.horaFin);
    const ahora = new Date();

    if (ahora < inicio || ahora > fin) {
      throw new ForbiddenException({
        code: 'FUERA_DE_HORARIO',
        message:
          'Solo se pueden registrar incidencias durante el horario del examen.',
      });
    }
  }

  // fecha (@db.Date, medianoche UTC) + hora (@db.Time, 1970-01-01 en UTC)
  // -> instante real, tomando la hora como hora de Bolivia (UTC-4).
  private combinar(fecha: Date, hora: Date): Date {
    const BOLIVIA_OFFSET_H = 4;
    return new Date(
      Date.UTC(
        fecha.getUTCFullYear(),
        fecha.getUTCMonth(),
        fecha.getUTCDate(),
        hora.getUTCHours() + BOLIVIA_OFFSET_H,
        hora.getUTCMinutes(),
        0,
      ),
    );
  }

  async listar(examenId: number, usuarioId: number) {
    await this.validarAcceso(examenId, usuarioId);
    const filas = await this.prisma.incidenciaIngreso.findMany({
      where: { examenId },
      orderBy: { fechaHora: 'desc' },
      include: incluir,
    });
    return filas.map((f) => this.aDto(f as Fila));
  }

  async crear(dto: CrearIncidenciaDto, usuarioId: number, ip?: string) {
    const examenId = Number(dto.examenId);
    if (!Number.isInteger(examenId)) {
      throw new NotFoundException({
        code: 'EXAMEN_INVALIDO',
        message: 'El examen no es válido',
      });
    }
    const examen = await this.validarAcceso(examenId, usuarioId);
    this.validarHorario(examen.reservaAmbiente);

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { cod_sis: dto.codigoSis },
    });
    if (!estudiante) {
      throw new NotFoundException({
        code: 'SIS_NO_EXISTE',
        message: 'El código SIS ingresado no existe',
      });
    }

    // fechaHora (default now()) y registradoPor los define el servidor
    const creada = await this.prisma.incidenciaIngreso.create({
      data: {
        examenId,
        registradoPor: usuarioId,
        estudianteId: estudiante.id,
        tipoIncidencia: dto.motivo,
        descripcion: dto.observaciones || null,
      },
      include: incluir,
    });

    await this.prisma.bitacora_Auditoria.create({
      data: {
        usuarioId,
        accion: 'CREAR_INCIDENCIA',
        modulo: 'Incidencias',
        tablaAfectada: 'incidencia_ingreso',
        registroId: creada.id,
        detallesNuevo: {
          examenId,
          codigoSis: dto.codigoSis,
          motivo: dto.motivo,
        },
        ipOrigen: ip?.slice(0, 45),
      },
    });
    return this.aDto(creada);
  }
}
