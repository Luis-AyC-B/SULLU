import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoExamen } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { UpdateIngresoDto } from './dto/update-ingreso.dto';
import { ExamenAsignadoResponseDto } from './dto/examen-asignado-response.dto';
import {
  ResumenExamenResponseDto,
  UltimoIngresoItemDto,
} from './dto/resumen-examen-response.dto';

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

@Injectable()
export class IngresosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Determina el estado operativo del examen ('EN_CURSO', 'PROXIMO' o 'FINALIZADO')
   * según el estado registrado en BD, la fecha y los horarios de inicio y fin.
   */
  private calcularEstado(
    estadoExamen: EstadoExamen,
    fecha: Date,
    horaIni?: Date | null,
    horaFin?: Date | null,
  ): 'EN_CURSO' | 'PROXIMO' | 'FINALIZADO' {
    if (
      estadoExamen === EstadoExamen.FINALIZADO ||
      estadoExamen === EstadoExamen.CANCELADO
    ) {
      return 'FINALIZADO';
    }

    if (estadoExamen === EstadoExamen.EN_CURSO) {
      return 'EN_CURSO';
    }

    const ahora = new Date();
    const fechaYMD = fecha.toISOString().split('T')[0];
    const ahoraYMD = ahora.toISOString().split('T')[0];

    // Examen en fecha futura
    if (fechaYMD > ahoraYMD) {
      return 'PROXIMO';
    }

    // Examen en fecha pasada
    if (fechaYMD < ahoraYMD) {
      return 'FINALIZADO';
    }

    // El examen es hoy (fechaYMD === ahoraYMD)
    if (!horaIni || !horaFin) {
      return 'EN_CURSO';
    }

    const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
    const iniMinutos = horaIni.getUTCHours() * 60 + horaIni.getUTCMinutes();
    const finMinutos = horaFin.getUTCHours() * 60 + horaFin.getUTCMinutes();

    if (ahoraMinutos < iniMinutos) {
      return 'PROXIMO';
    }

    if (ahoraMinutos <= finMinutos) {
      return 'EN_CURSO';
    }

    // Si ya pasó la hora pero sigue en el mismo día sin haber sido cerrado manualmente
    return 'EN_CURSO';
  }

  /**
   * Retorna 'Hoy' si la fecha corresponde al día actual, o 'D mes YYYY' para otras fechas.
   */
  private formatearFechaBadge(fecha: Date): string {
    const ahora = new Date();
    const fechaYMD = fecha.toISOString().split('T')[0];
    const ahoraYMD = ahora.toISOString().split('T')[0];

    if (fechaYMD === ahoraYMD) {
      return 'Hoy';
    }

    const d = fecha.getUTCDate();
    const m = MESES[fecha.getUTCMonth()];
    const y = fecha.getUTCFullYear();
    return `${d} ${m} ${y}`;
  }

  /**
   * HU7: Obtiene todos los exámenes asignados al colaborador de control autenticado,
   * excluyendo los finalizados o cancelados y ordenados cronológicamente por fecha y hora.
   */
  async getMisExamenes(
    colaboradorId: number,
  ): Promise<ExamenAsignadoResponseDto[]> {
    const asignaciones = await this.prisma.examenControlador.findMany({
      where: {
        colaboradorId,
        examen: {
          estado: {
            notIn: [EstadoExamen.FINALIZADO, EstadoExamen.CANCELADO],
          },
        },
      },
      include: {
        examen: {
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
                  },
                },
              },
            },
            _count: {
              select: {
                estudiantes: {
                  where: { estado_habilitado: true },
                },
              },
            },
          },
        },
      },
    });

    // Ordenar cronológicamente por fecha y hora de inicio de forma ascendente
    asignaciones.sort((a, b) => {
      const fechaA = a.examen.reservaAmbiente?.fecha
        ? new Date(a.examen.reservaAmbiente.fecha).getTime()
        : 0;
      const fechaB = b.examen.reservaAmbiente?.fecha
        ? new Date(b.examen.reservaAmbiente.fecha).getTime()
        : 0;
      if (fechaA !== fechaB) return fechaA - fechaB;

      const horaA = a.examen.reservaAmbiente?.horarioFijo?.horaIni
        ? new Date(a.examen.reservaAmbiente.horarioFijo.horaIni).getTime()
        : 0;
      const horaB = b.examen.reservaAmbiente?.horarioFijo?.horaIni
        ? new Date(b.examen.reservaAmbiente.horarioFijo.horaIni).getTime()
        : 0;
      return horaA - horaB;
    });

    const resultados: ExamenAsignadoResponseDto[] = [];

    for (const asig of asignaciones) {
      const ex = asig.examen;
      const resAmb = ex.reservaAmbiente;
      const horFijo = resAmb?.horarioFijo;
      const cm = ex.carrerasMaterias?.[0]?.carrera_materia;

      const fechaDate = resAmb?.fecha ? new Date(resAmb.fecha) : new Date();
      const horaIni = horFijo?.horaIni ? new Date(horFijo.horaIni) : null;
      const horaFin = horFijo?.horaFin ? new Date(horFijo.horaFin) : null;

      const estadoCalculado = this.calcularEstado(
        ex.estado,
        fechaDate,
        horaIni,
        horaFin,
      );

      // Si el cálculo determina que el examen ya caducó, se filtra de la lista activa
      if (estadoCalculado === 'FINALIZADO') {
        continue;
      }

      const horaInicioStr = horaIni
        ? horaIni.toISOString().substring(11, 16)
        : '08:00';
      const horaFinStr = horaFin
        ? horaFin.toISOString().substring(11, 16)
        : '09:30';

      const docenteNombre = ex.responsable
        ? `${ex.responsable.nombre} ${ex.responsable.apellido ?? ''}`.trim()
        : 'Docente no asignado';

      resultados.push({
        id: ex.id,
        asignatura: cm?.materia?.nombre ?? 'Materia general',
        sigla: cm?.materia?.sigla ?? undefined,
        docente: docenteNombre,
        rolAsignacion: asig.rolAsignacion || 'Control principal',
        estado: estadoCalculado,
        totalEstudiantes: ex._count?.estudiantes ?? 0,
        fecha: this.formatearFechaBadge(fechaDate),
        horario: `${horaInicioStr}–${horaFinStr}`,
        ambiente: resAmb?.ambiente?.nombre ?? 'Aula asignada',
        capacidadAmbiente: resAmb?.ambiente?.capacidad ?? undefined,
        tipoExamen: ex.tipoExamen ?? 'Examen programado',
      });
    }

    return resultados;
  }

  /**
   * HU7: Obtiene el resumen en vivo y la lista de últimos ingresos de un examen asignado.
   * Valida que el colaborador tenga asignado dicho examen antes de exponer los datos.
   */
  async getResumenExamen(
    examenId: number,
    user: AuthenticatedUser,
  ): Promise<ResumenExamenResponseDto> {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      include: {
        reservaAmbiente: {
          include: {
            horarioFijo: true,
            ambiente: true,
          },
        },
        carrerasMaterias: {
          include: {
            carrera_materia: {
              include: {
                materia: true,
              },
            },
          },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException(`Examen con ID ${examenId} no encontrado.`);
    }

    // Verificar asignación operativa del colaborador (o pase si es administrador)
    const esAdmin = (user.permisos ?? []).includes('usuarios.crear');
    if (!esAdmin) {
      const asignacion = await this.prisma.examenControlador.findUnique({
        where: {
          examenId_colaboradorId: {
            examenId,
            colaboradorId: user.id,
          },
        },
      });

      if (!asignacion) {
        throw new ForbiddenException(
          'No tienes permiso para controlar este examen.',
        );
      }
    }

    // Métricas en tiempo real y últimos ingresos
    const [totalHabilitados, ingresados, incidencias, ultimosIngresosRaw] =
      await Promise.all([
        this.prisma.examen_Estudiante.count({
          where: {
            examenId,
            estado_habilitado: true,
          },
        }),
        this.prisma.ingreso.count({
          where: { examenId },
        }),
        this.prisma.incidenciaIngreso.count({
          where: { examenId },
        }),
        this.prisma.ingreso.findMany({
          where: { examenId },
          include: {
            estudiante: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                cod_sis: true,
              },
            },
          },
          orderBy: { fechaHora: 'desc' },
          take: 10,
        }),
      ]);

    const pendientes = Math.max(0, totalHabilitados - ingresados);

    const resAmb = examen.reservaAmbiente;
    const horFijo = resAmb?.horarioFijo;
    const cm = examen.carrerasMaterias?.[0]?.carrera_materia;

    const fechaDate = resAmb?.fecha ? new Date(resAmb.fecha) : new Date();
    const horaIni = horFijo?.horaIni ? new Date(horFijo.horaIni) : null;
    const horaFin = horFijo?.horaFin ? new Date(horFijo.horaFin) : null;

    const horaInicioStr = horaIni
      ? horaIni.toISOString().substring(11, 16)
      : '08:00';
    const horaFinStr = horaFin
      ? horaFin.toISOString().substring(11, 16)
      : '09:30';

    const estadoCalculado = this.calcularEstado(
      examen.estado,
      fechaDate,
      horaIni,
      horaFin,
    );

    const ultimosIngresos: UltimoIngresoItemDto[] = ultimosIngresosRaw.map(
      (ing) => {
        const horaStr = ing.fechaHora
          ? new Date(ing.fechaHora).toISOString().substring(11, 16)
          : '';
        const nombreCompleto = ing.estudiante
          ? `${ing.estudiante.nombre} ${ing.estudiante.apellido ?? ''}`.trim()
          : 'Estudiante no registrado';

        const metodoUpper = (ing.metodo || 'QR').toUpperCase();
        const metodo: 'QR' | 'MANUAL' =
          metodoUpper === 'MANUAL' ? 'MANUAL' : 'QR';

        return {
          id: ing.id,
          nombre: nombreCompleto,
          codSis: ing.estudiante?.cod_sis ?? '',
          hora: horaStr,
          metodo,
        };
      },
    );

    return {
      examenId: examen.id,
      asignatura: cm?.materia?.nombre ?? 'Materia general',
      ambiente: resAmb?.ambiente?.nombre ?? 'Aula asignada',
      horario: `${horaInicioStr}–${horaFinStr}`,
      estado: estadoCalculado,
      totalHabilitados,
      ingresados,
      pendientes,
      incidencias,
      ultimosIngresos,
    };
  }

  /**
   * Obtiene la ficha de un examen individual asignado al colaborador.
   */
  async getExamenDetalle(
    examenId: number,
    user: AuthenticatedUser,
  ): Promise<ExamenAsignadoResponseDto> {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
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
              },
            },
          },
        },
        _count: {
          select: {
            estudiantes: {
              where: { estado_habilitado: true },
            },
          },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException(`Examen con ID ${examenId} no encontrado.`);
    }

    const esAdmin = (user.permisos ?? []).includes('usuarios.crear');
    let rolAsignacion = 'Control principal';

    if (!esAdmin) {
      const asignacion = await this.prisma.examenControlador.findUnique({
        where: {
          examenId_colaboradorId: {
            examenId,
            colaboradorId: user.id,
          },
        },
      });

      if (!asignacion) {
        throw new ForbiddenException(
          'No tienes permiso para controlar este examen.',
        );
      }
      rolAsignacion = asignacion.rolAsignacion || 'Control principal';
    }

    const resAmb = examen.reservaAmbiente;
    const horFijo = resAmb?.horarioFijo;
    const cm = examen.carrerasMaterias?.[0]?.carrera_materia;

    const fechaDate = resAmb?.fecha ? new Date(resAmb.fecha) : new Date();
    const horaIni = horFijo?.horaIni ? new Date(horFijo.horaIni) : null;
    const horaFin = horFijo?.horaFin ? new Date(horFijo.horaFin) : null;

    const horaInicioStr = horaIni
      ? horaIni.toISOString().substring(11, 16)
      : '08:00';
    const horaFinStr = horaFin
      ? horaFin.toISOString().substring(11, 16)
      : '09:30';

    const estadoCalculado = this.calcularEstado(
      examen.estado,
      fechaDate,
      horaIni,
      horaFin,
    );

    const docenteNombre = examen.responsable
      ? `${examen.responsable.nombre} ${examen.responsable.apellido ?? ''}`.trim()
      : 'Docente no asignado';

    return {
      id: examen.id,
      asignatura: cm?.materia?.nombre ?? 'Materia general',
      sigla: cm?.materia?.sigla ?? undefined,
      docente: docenteNombre,
      rolAsignacion,
      estado: estadoCalculado,
      totalEstudiantes: examen._count?.estudiantes ?? 0,
      fecha: this.formatearFechaBadge(fechaDate),
      horario: `${horaInicioStr}–${horaFinStr}`,
      ambiente: resAmb?.ambiente?.nombre ?? 'Aula asignada',
      capacidadAmbiente: resAmb?.ambiente?.capacidad ?? undefined,
      tipoExamen: examen.tipoExamen ?? 'Examen programado',
    };
  }

  // --- MÉTODOS CRUD BÁSICOS PARA EL MÓDULO DE INGRESOS ---

  create(_createIngresoDto: CreateIngresoDto) {
    return 'This action adds a new ingreso';
  }

  findAll() {
    return 'This action returns all ingresos';
  }

  findOne(id: number) {
    return `This action returns a #${id} ingreso`;
  }

  update(id: number, _updateIngresoDto: UpdateIngresoDto) {
    return `This action updates a #${id} ingreso`;
  }

  remove(id: number) {
    return `This action removes a #${id} ingreso`;
  }
}
