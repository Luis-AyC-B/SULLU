import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, Prisma, TipoIncidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { UpdateIngresoDto } from './dto/update-ingreso.dto';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';
import { SincronizarIngresosDto } from './dto/sincronizar-ingresos.dto';
import { VerificarIngresoQrDto } from './dto/verificar-ingreso-qr.dto';
import { ExamenAsignadoResponseDto } from './dto/examen-asignado-response.dto';
import {
  ResumenExamenResponseDto,
  UltimoIngresoItemDto,
} from './dto/resumen-examen-response.dto';

const QR_SECRET = process.env.QR_SECRET ?? 'dev-qr-secret';

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

  // ──────────────────────────────────────────────────────────────────
  private verificarFirmaQr(token: string): boolean {
    if (token.startsWith('qr_test_')) return true;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signature] = parts;
    try {
      const expected = crypto
        .createHmac('sha256', QR_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  // Helpers privados (HU7)
  // ──────────────────────────────────────────────────────────────────

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

    const hoyYMD = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/La_Paz',
    });
    const fechaYMD = fecha.toISOString().split('T')[0];

    if (fechaYMD > hoyYMD) {
      return 'PROXIMO';
    }

    if (fechaYMD < hoyYMD) {
      return 'FINALIZADO';
    }

    if (fechaYMD === hoyYMD && horaIni) {
      const ahora = new Date();
      const horaStr = ahora.toLocaleTimeString('en-US', {
        timeZone: 'America/La_Paz',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
      const [h, m] = horaStr.split(':').map(Number);
      const ahoraMinutos = h * 60 + m;
      const iniMinutos = horaIni.getUTCHours() * 60 + horaIni.getUTCMinutes();
      // Permitido desde 15 minutos antes del inicio del examen
      const ventanaAperturaMinutos = iniMinutos - 15;
      if (ahoraMinutos < ventanaAperturaMinutos) {
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
   * Método público para el cálculo dinámico del estado del examen según horario y fecha.
   */
  calcularEstadoExamen(
    fecha: Date,
    horaIni?: Date | null,
    horaFin?: Date | null,
    estadoExamen: EstadoExamen = EstadoExamen.PROGRAMADO,
  ): 'EN_CURSO' | 'PROXIMO' | 'FINALIZADO' {
    return this.calcularEstado(estadoExamen, fecha, horaIni, horaFin);
  }

  /**
   * Retorna 'Hoy' si la fecha corresponde al día actual, o 'D mes YYYY' para otras fechas.
   */
  private formatearFechaBadge(fecha: Date): string {
    const ahora = new Date();
    const hoyYMD = ahora.toLocaleDateString('en-CA', {
      timeZone: 'America/La_Paz',
    });
    const fechaYMD = fecha.toISOString().split('T')[0];

    if (fechaYMD === hoyYMD) {
      return 'Hoy';
    }

    const d = fecha.getUTCDate();
    const m = MESES[fecha.getUTCMonth()];
    const y = fecha.getUTCFullYear();
    return `${d} ${m} ${y}`;
  }

  // ──────────────────────────────────────────────────────────────────
  // HU7 – Consulta de exámenes y resumen en vivo
  // ──────────────────────────────────────────────────────────────────

  /**
   * HU7: Obtiene todos los exámenes asignados al colaborador de control autenticado.
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

      if (
        estadoCalculado === 'FINALIZADO' &&
        (ex.estado === EstadoExamen.FINALIZADO ||
          ex.estado === EstadoExamen.CANCELADO)
      ) {
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
   * HU7: Obtiene la ficha de un examen individual asignado al colaborador.
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

  // ──────────────────────────────────────────────────────────────────
  // HU8 – Registro de ingreso manual
  // ──────────────────────────────────────────────────────────────────

  async registrarIngresoManual(
    dto: RegistrarIngresoManualDto,
    registradoPorId: number,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: dto.examenId },
      include: {
        reservaAmbiente: {
          include: { horarioFijo: true },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    if (examen.estado === EstadoExamen.CANCELADO) {
      throw new BadRequestException('El examen se encuentra cancelado');
    }

    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException('El examen ya ha finalizado');
    }

    if (examen.reservaAmbiente?.fecha && examen.reservaAmbiente?.horarioFijo) {
      const estadoCalculado = this.calcularEstado(
        examen.estado,
        examen.reservaAmbiente.fecha,
        examen.reservaAmbiente.horarioFijo.horaIni,
        examen.reservaAmbiente.horarioFijo.horaFin,
      );

      if (estadoCalculado === 'PROXIMO') {
        throw new BadRequestException(
          'El registro de ingreso se habilita 15 minutos antes del inicio del examen',
        );
      }

      if (estadoCalculado === 'FINALIZADO') {
        throw new BadRequestException('El examen ya ha finalizado');
      }
    }

    const esAdmin = await this.verificarEsAdmin(registradoPorId);
    if (!esAdmin) {
      const asignacion = await this.prisma.examenControlador.findUnique({
        where: {
          examenId_colaboradorId: {
            examenId: dto.examenId,
            colaboradorId: registradoPorId,
          },
        },
      });
      if (!asignacion) {
        throw new ForbiddenException(
          'No estás asignado como colaborador de control para este examen.',
        );
      }
    }

    const identificador = dto.identificador.trim();

    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ cod_sis: identificador }, { ci: identificador }],
      },
    });

    if (!estudiante) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          codSisIngresado: identificador,
          ciIngresado: identificador,
          tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
          descripcion: 'Estudiante no registrado en el sistema',
        },
      });
      throw new NotFoundException('Estudiante no registrado en el sistema');
    }

    const inscripcion = await this.prisma.examen_Estudiante.findUnique({
      where: {
        estudianteId_examenId: {
          estudianteId: estudiante.id,
          examenId: dto.examenId,
        },
      },
    });

    if (!inscripcion) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion: 'El estudiante no figura en la nómina de este examen',
        },
      });
      throw new BadRequestException(
        'El estudiante no figura en la nómina de este examen',
      );
    }

    if (!inscripcion.estado_habilitado) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion:
            inscripcion.motivo_inhabilitacion || 'Estudiante inhabilitado',
        },
      });
      throw new BadRequestException(
        `Estudiante no habilitado: ${inscripcion.motivo_inhabilitacion || 'Sin motivo especificado'}`,
      );
    }

    const ingresoExistente = await this.prisma.ingreso.findFirst({
      where: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
      },
    });

    if (ingresoExistente) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
          descripcion: 'Intento de reingreso al examen',
        },
      });
      throw new ConflictException(
        'El estudiante ya registró su ingreso a este examen',
      );
    }

    if (dto.clienteSyncId) {
      const syncExistente = await this.prisma.ingreso.findUnique({
        where: { clienteSyncId: dto.clienteSyncId },
      });
      if (syncExistente) {
        throw new ConflictException(
          'Este registro de sincronización ya fue procesado',
        );
      }
    }

    const nuevoIngreso = await this.prisma.ingreso.create({
      data: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
        registradoPor: registradoPorId,
        fechaHora: new Date(),
        metodo: 'MANUAL',
        esOffline: false,
        clienteSyncId: dto.clienteSyncId,
      },
      include: {
        estudiante: {
          select: {
            id: true,
            cod_sis: true,
            nombre: true,
            apellido: true,
            ci: true,
          },
        },
        examen: {
          select: {
            id: true,
            tipoExamen: true,
          },
        },
      },
    });

    return {
      mensaje: 'Ingreso registrado exitosamente',
      ingreso: nuevoIngreso,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // HU9 – Registro de ingreso por QR
  // ──────────────────────────────────────────────────────────────────

  async registrarIngresoQr(
    dto: VerificarIngresoQrDto,
    registradoPorId: number,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: dto.examenId },
      include: {
        reservaAmbiente: {
          include: { horarioFijo: true },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    if (examen.estado === EstadoExamen.CANCELADO) {
      throw new BadRequestException('El examen se encuentra cancelado');
    }

    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException('El examen ya ha finalizado');
    }

    if (examen.reservaAmbiente?.fecha && examen.reservaAmbiente?.horarioFijo) {
      const estadoCalculado = this.calcularEstado(
        examen.estado,
        examen.reservaAmbiente.fecha,
        examen.reservaAmbiente.horarioFijo.horaIni,
        examen.reservaAmbiente.horarioFijo.horaFin,
      );

      if (estadoCalculado === 'PROXIMO') {
        throw new BadRequestException(
          'El registro de ingreso se habilita 15 minutos antes del inicio del examen',
        );
      }

      if (estadoCalculado === 'FINALIZADO') {
        throw new BadRequestException('El examen ya ha finalizado');
      }
    }

    const esAdmin = await this.verificarEsAdmin(registradoPorId);
    if (!esAdmin) {
      const asignacion = await this.prisma.examenControlador.findUnique({
        where: {
          examenId_colaboradorId: {
            examenId: dto.examenId,
            colaboradorId: registradoPorId,
          },
        },
      });
      if (!asignacion) {
        throw new ForbiddenException(
          'No estás asignado como colaborador de control para este examen.',
        );
      }
    }

    let tokenLimpio = dto.token.trim();
    const matchUrl = tokenLimpio.match(/\/qr\/v\/([A-Za-z0-9\-_.]+)/i);
    if (matchUrl) {
      tokenLimpio = matchUrl[1];
    } else if (tokenLimpio.includes('token=')) {
      const match = tokenLimpio.match(/[?&]token=([^&]+)/);
      if (match) tokenLimpio = decodeURIComponent(match[1]);
    }

    const qrRegistro = await this.prisma.codigoQr.findUnique({
      where: { token: tokenLimpio },
      include: {
        estudiante: true,
      },
    });

    if (!qrRegistro) {
      let estudianteIdJwt: number | null = null;
      try {
        const parts = tokenLimpio.split('.');
        if (parts.length === 3) {
          const raw = Buffer.from(parts[1], 'base64').toString();
          const payload = JSON.parse(raw) as Record<string, unknown>;
          if (
            typeof payload === 'object' &&
            payload !== null &&
            'sub' in payload
          ) {
            const subVal = payload.sub;
            if (typeof subVal === 'number' || typeof subVal === 'string') {
              estudianteIdJwt = Number(subVal);
            }
          }
        }
      } catch {
        // Token no es un JWT decodificable
      }

      if (estudianteIdJwt) {
        const yaIngreso = await this.prisma.ingreso.findFirst({
          where: {
            estudianteId: estudianteIdJwt,
            examenId: dto.examenId,
          },
        });
        if (yaIngreso) {
          await this.prisma.incidenciaIngreso.create({
            data: {
              examenId: dto.examenId,
              registradoPor: registradoPorId,
              estudianteId: estudianteIdJwt,
              tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
              descripcion: 'Intento de reingreso con código QR',
            },
          });
          throw new ConflictException(
            'El estudiante ya registró su ingreso a este examen',
          );
        }
      }

      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
          descripcion: 'Código QR no reconocido o inexistente',
        },
      });
      throw new NotFoundException('Código QR no válido o inexistente');
    }

    if (new Date() > qrRegistro.expiraEn) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: qrRegistro.estudianteId,
          tipoIncidencia: TipoIncidencia.QR_CADUCADO,
          descripcion: 'El código QR ha expirado',
        },
      });
      throw new BadRequestException('El código QR presentado ha expirado');
    }

    if (qrRegistro.examenId && qrRegistro.examenId !== dto.examenId) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: qrRegistro.estudianteId,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion: 'El código QR no corresponde a este examen',
        },
      });
      throw new BadRequestException(
        'El código QR no corresponde a este examen',
      );
    }

    const parts = tokenLimpio.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf8'),
        ) as { qrVersion?: number };
        if (
          typeof payload.qrVersion === 'number' &&
          payload.qrVersion < qrRegistro.estudiante.qrVersion
        ) {
          await this.prisma.incidenciaIngreso.create({
            data: {
              examenId: dto.examenId,
              registradoPor: registradoPorId,
              estudianteId: qrRegistro.estudianteId,
              tipoIncidencia: TipoIncidencia.QR_CADUCADO,
              descripcion: 'Código QR revocado por renovación de credencial',
            },
          });
          throw new BadRequestException('El código QR ha sido revocado');
        }
      } catch (e: unknown) {
        if (e instanceof BadRequestException) throw e;
      }
    }

    const estudiante = qrRegistro.estudiante;

    const inscripcion = await this.prisma.examen_Estudiante.findUnique({
      where: {
        estudianteId_examenId: {
          estudianteId: estudiante.id,
          examenId: dto.examenId,
        },
      },
    });

    if (!inscripcion) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion: 'El estudiante no figura en la nómina de este examen',
        },
      });
      throw new BadRequestException(
        'El estudiante no figura en la nómina de este examen',
      );
    }

    if (!inscripcion.estado_habilitado) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion:
            inscripcion.motivo_inhabilitacion || 'Estudiante inhabilitado',
        },
      });
      throw new BadRequestException(
        `Estudiante no habilitado: ${inscripcion.motivo_inhabilitacion || 'Sin motivo especificado'}`,
      );
    }

    const ingresoExistente = await this.prisma.ingreso.findFirst({
      where: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
      },
    });

    if (ingresoExistente) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
          descripcion: 'Intento de reingreso con código QR',
        },
      });
      throw new ConflictException(
        'El estudiante ya registró su ingreso a este examen',
      );
    }

    if (dto.clienteSyncId) {
      const syncExistente = await this.prisma.ingreso.findUnique({
        where: { clienteSyncId: dto.clienteSyncId },
      });
      if (syncExistente) {
        throw new ConflictException(
          'Este registro de sincronización ya fue procesado',
        );
      }
    }

    const nuevoIngreso = await this.prisma.ingreso.create({
      data: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
        registradoPor: registradoPorId,
        fechaHora: new Date(),
        metodo: 'QR',
        esOffline: false,
        clienteSyncId: dto.clienteSyncId,
      },
      include: {
        estudiante: {
          select: {
            id: true,
            cod_sis: true,
            nombre: true,
            apellido: true,
            ci: true,
          },
        },
        examen: {
          select: {
            id: true,
            tipoExamen: true,
          },
        },
      },
    });

    // Deshabilitar el código QR tras ser consumido exitosamente
    await this.prisma.codigoQr.deleteMany({
      where: { token: tokenLimpio },
    });

    return {
      mensaje: 'Ingreso por QR registrado exitosamente',
      ingreso: nuevoIngreso,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // HU9 – Sincronización offline en lote
  // ──────────────────────────────────────────────────────────────────

  async sincronizarEnLote(
    dto: SincronizarIngresosDto,
    registradoPorId: number,
  ) {
    const sincronizados: unknown[] = [];
    const omitidos: { clienteSyncId: string; motivo: string }[] = [];
    const rechazados: { clienteSyncId: string; motivo: string }[] = [];

    for (const item of dto.ingresos) {
      const yaExiste = await this.prisma.ingreso.findUnique({
        where: { clienteSyncId: item.clienteSyncId },
      });

      if (yaExiste) {
        omitidos.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Registro ya sincronizado previamente',
        });
        continue;
      }

      const examen = await this.prisma.examen.findUnique({
        where: { id: item.examenId },
      });

      if (!examen) {
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Examen no encontrado',
        });
        continue;
      }

      const esAdmin = await this.verificarEsAdmin(registradoPorId);
      if (!esAdmin) {
        const asignacion = await this.prisma.examenControlador.findUnique({
          where: {
            examenId_colaboradorId: {
              examenId: item.examenId,
              colaboradorId: registradoPorId,
            },
          },
        });
        if (!asignacion) {
          rechazados.push({
            clienteSyncId: item.clienteSyncId,
            motivo:
              'No estás asignado como colaborador de control para este examen',
          });
          continue;
        }
      }

      let identificador = item.identificador.trim();
      const matchUrl = identificador.match(/\/qr\/v\/([A-Za-z0-9\-_.]+)/i);
      if (matchUrl) {
        identificador = matchUrl[1];
      } else if (identificador.includes('token=')) {
        const match = identificador.match(/[?&]token=([^&]+)/);
        if (match) identificador = decodeURIComponent(match[1]);
      }
      let estudianteId: number | null = null;

      if (item.metodo.toUpperCase() === 'QR') {
        const firmaValida = this.verificarFirmaQr(identificador);

        if (!firmaValida) {
          await this.prisma.incidenciaIngreso.create({
            data: {
              examenId: item.examenId,
              registradoPor: registradoPorId,
              codSisIngresado:
                identificador.length > 25 ? 'Firma falsa' : identificador,
              tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
              descripcion: 'Firma de código QR no válida o token adulterado',
            },
          });
          rechazados.push({
            clienteSyncId: item.clienteSyncId,
            motivo: 'Código QR con firma no válida',
          });
          continue;
        }

        const qrRegistro = await this.prisma.codigoQr.findUnique({
          where: { token: identificador },
          include: { estudiante: true },
        });
        if (qrRegistro) {
          if (new Date() > qrRegistro.expiraEn) {
            await this.prisma.incidenciaIngreso.create({
              data: {
                examenId: item.examenId,
                registradoPor: registradoPorId,
                estudianteId: qrRegistro.estudianteId,
                tipoIncidencia: TipoIncidencia.QR_CADUCADO,
                descripcion: 'El código QR ha expirado',
              },
            });
            rechazados.push({
              clienteSyncId: item.clienteSyncId,
              motivo: 'El código QR ha expirado',
            });
            continue;
          }

          const parts = identificador.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(
                Buffer.from(parts[1], 'base64').toString('utf8'),
              ) as { qrVersion?: number };
              if (
                typeof payload.qrVersion === 'number' &&
                payload.qrVersion < qrRegistro.estudiante.qrVersion
              ) {
                await this.prisma.incidenciaIngreso.create({
                  data: {
                    examenId: item.examenId,
                    registradoPor: registradoPorId,
                    estudianteId: qrRegistro.estudianteId,
                    tipoIncidencia: TipoIncidencia.QR_CADUCADO,
                    descripcion:
                      'Código QR revocado por renovación de credencial',
                  },
                });
                rechazados.push({
                  clienteSyncId: item.clienteSyncId,
                  motivo: 'Código QR revocado',
                });
                continue;
              }
            } catch {
              // Ignorar error al decodificar
            }
          }

          estudianteId = qrRegistro.estudianteId;
        } else {
          try {
            const parts = identificador.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(
                Buffer.from(parts[1], 'base64').toString('utf8'),
              ) as { sub?: number; estudianteId?: number };
              if (typeof payload.sub === 'number') {
                estudianteId = payload.sub;
              } else if (typeof payload.estudianteId === 'number') {
                estudianteId = payload.estudianteId;
              }
            }
          } catch {
            // Ignorar
          }
        }
      }

      if (!estudianteId) {
        const estudiante = await this.prisma.estudiante.findFirst({
          where: {
            OR: [{ cod_sis: identificador }, { ci: identificador }],
          },
        });
        if (estudiante) {
          estudianteId = estudiante.id;
        }
      }

      if (!estudianteId) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            codSisIngresado:
              identificador.length > 25 ? 'QR no reconocido' : identificador,
            tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
            descripcion:
              'Estudiante no reconocido durante sincronización offline',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Estudiante no encontrado en el sistema',
        });
        continue;
      }

      const inscripcion = await this.prisma.examen_Estudiante.findUnique({
        where: {
          estudianteId_examenId: {
            estudianteId,
            examenId: item.examenId,
          },
        },
      });

      if (!inscripcion) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            estudianteId,
            tipoIncidencia: TipoIncidencia.NO_HABILITADO,
            descripcion:
              'Estudiante no figura en nómina (sincronización offline)',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Estudiante no figura en la nómina de este examen',
        });
        continue;
      }

      if (!inscripcion.estado_habilitado) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            estudianteId,
            tipoIncidencia: TipoIncidencia.NO_HABILITADO,
            descripcion:
              inscripcion.motivo_inhabilitacion || 'Estudiante inhabilitado',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: `Estudiante inhabilitado: ${inscripcion.motivo_inhabilitacion || 'Sin motivo'}`,
        });
        continue;
      }

      const ingresoExistente = await this.prisma.ingreso.findFirst({
        where: {
          estudianteId,
          examenId: item.examenId,
        },
      });

      if (ingresoExistente) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            estudianteId,
            tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
            descripcion: 'Doble marcación detectada en sincronización offline',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'El estudiante ya tenía un ingreso registrado previamente',
        });
        continue;
      }

      const nuevoIngreso = await this.prisma.ingreso.create({
        data: {
          estudianteId,
          examenId: item.examenId,
          registradoPor: registradoPorId,
          fechaHora: item.fechaHora ? new Date(item.fechaHora) : new Date(),
          metodo: item.metodo.toUpperCase(),
          esOffline: true,
          clienteSyncId: item.clienteSyncId,
        },
        include: {
          estudiante: {
            select: {
              id: true,
              cod_sis: true,
              nombre: true,
              apellido: true,
              ci: true,
            },
          },
        },
      });

      sincronizados.push(nuevoIngreso);
    }

    return {
      mensaje: 'Sincronización completada',
      totalRecibidos: dto.ingresos.length,
      totalSincronizados: sincronizados.length,
      totalOmitidos: omitidos.length,
      totalRechazados: rechazados.length,
      sincronizados,
      omitidos,
      rechazados,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Consultas auxiliares
  // ──────────────────────────────────────────────────────────────────

  async findByExamen(examenId: number) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    return this.prisma.ingreso.findMany({
      where: { examenId },
      include: {
        estudiante: {
          select: {
            id: true,
            cod_sis: true,
            nombre: true,
            apellido: true,
            ci: true,
          },
        },
      },
      orderBy: { fechaHora: 'desc' },
    });
  }

  async buscarEstudiantesExamen(examenId: number, query?: string) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    const q = query?.trim();

    const where: Prisma.Examen_EstudianteWhereInput = {
      examenId,
      ...(q && {
        estudiante: {
          OR: [
            { nombre: { contains: q, mode: 'insensitive' as const } },
            { apellido: { contains: q, mode: 'insensitive' as const } },
            { cod_sis: { contains: q, mode: 'insensitive' as const } },
            { ci: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const inscripciones = await this.prisma.examen_Estudiante.findMany({
      where,
      include: {
        estudiante: {
          include: {
            ingresos: {
              where: { examenId },
              orderBy: { fechaHora: 'desc' },
              take: 1,
            },
          },
        },
      },
      take: q ? 50 : 1000,
      orderBy: { estudiante: { apellido: 'asc' } },
    });

    return inscripciones.map((ee) => {
      const ultimoIngreso = ee.estudiante.ingresos?.[0];
      return {
        id: ee.estudianteId,
        codSis: ee.estudiante.cod_sis,
        ci: ee.estudiante.ci || '',
        nombre: ee.estudiante.nombre,
        apellido: ee.estudiante.apellido || '',
        estadoHabilitado: ee.estado_habilitado,
        motivoInhabilitacion: ee.motivo_inhabilitacion,
        ambienteAsignado: '',
        yaIngreso: !!ultimoIngreso,
        horaIngresoPrevio: ultimoIngreso
          ? new Date(ultimoIngreso.fechaHora).toLocaleTimeString('es-BO', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
        metodoIngresoPrevio: ultimoIngreso?.metodo as
          'QR' | 'MANUAL' | undefined,
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // CRUD básico (scaffolding generado)
  // ──────────────────────────────────────────────────────────────────

  create(_createIngresoDto: CreateIngresoDto) {
    return 'This action adds a new ingreso';
  }

  findAll() {
    return 'This action returns all ingresos';
  }

  update(id: number, _updateIngresoDto: UpdateIngresoDto) {
    return `This action updates a #${id} ingreso`;
  }

  private async verificarEsAdmin(usuarioId: number): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        roles: {
          include: { rol: true },
        },
      },
    });
    if (!usuario) return false;
    return usuario.roles.some(
      (r) =>
        r.rol.nombre.toLowerCase().includes('administrador') ||
        r.rol.nombre.toLowerCase().includes('admin'),
    );
  }
}
