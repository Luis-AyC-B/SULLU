import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExamenControladorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * HU13: Asigna un colaborador aprobado a un examen, validando ausencia de colisiones horarias.
   */
  async asignarControlador(
    examenId: number,
    colaboradorId: number,
    docenteId?: number,
  ) {
    let colId = colaboradorId;
    const relDirect = await this.prisma.docenteColaborador.findFirst({
      where: {
        id: colaboradorId,
        ...(docenteId ? { docenteId } : {}),
      },
    });
    if (relDirect && relDirect.colaboradorId) {
      colId = relDirect.colaboradorId;
    }

    // 1. Validar que la vinculación del colaborador esté en estado APROBADO
    const vinculacion = await this.prisma.docenteColaborador.findFirst({
      where: {
        colaboradorId: colId,
        ...(docenteId ? { docenteId } : {}),
      },
    });

    if (
      !vinculacion ||
      vinculacion.estadoSolicitud !== EstadoSolicitud.APROBADO
    ) {
      throw new BadRequestException(
        'El colaborador debe estar en estado APROBADO para ser asignado.',
      );
    }

    // 2. Obtener datos del examen al que se desea asignar
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      include: {
        reservaAmbiente: {
          include: { horarioFijo: true, ambiente: true },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado.');
    }

    // 3. Algoritmo de detección de colisión y choque de horarios
    const asignacionesExistentes = await this.prisma.examenControlador.findMany(
      {
        where: { colaboradorId: colId },
        include: {
          examen: {
            include: {
              reservaAmbiente: {
                include: { horarioFijo: true },
              },
            },
          },
        },
      },
    );

    const fechaNuevo = examen.reservaAmbiente?.fecha
      ? new Date(examen.reservaAmbiente.fecha).toISOString().split('T')[0]
      : null;
    const horarioNuevoId = examen.reservaAmbiente?.horarioFijoId;

    for (const asig of asignacionesExistentes) {
      // Ignorar si es el mismo examen
      if (asig.examenId === examenId) continue;

      const asigFecha = asig.examen?.reservaAmbiente?.fecha
        ? new Date(asig.examen.reservaAmbiente.fecha)
            .toISOString()
            .split('T')[0]
        : null;
      const asigHorarioId = asig.examen?.reservaAmbiente?.horarioFijoId;

      if (fechaNuevo && asigFecha && fechaNuevo === asigFecha) {
        // Colisión por periodo fijo institucional
        if (
          horarioNuevoId &&
          asigHorarioId &&
          horarioNuevoId === asigHorarioId
        ) {
          throw new ConflictException(
            'Choque de horario detectado con otro examen asignado.',
          );
        }

        // Colisión por solapamiento de horas inicio/fin
        const hIniNuevo =
          examen.reservaAmbiente?.horarioFijo?.horaIni?.getTime();
        const hFinNuevo =
          examen.reservaAmbiente?.horarioFijo?.horaFin?.getTime();
        const hIniAsig =
          asig.examen?.reservaAmbiente?.horarioFijo?.horaIni?.getTime();
        const hFinAsig =
          asig.examen?.reservaAmbiente?.horarioFijo?.horaFin?.getTime();

        if (hIniNuevo && hFinNuevo && hIniAsig && hFinAsig) {
          if (Math.max(hIniNuevo, hIniAsig) < Math.min(hFinNuevo, hFinAsig)) {
            throw new ConflictException(
              'Choque de horario detectado con otro examen asignado.',
            );
          }
        }
      }
    }

    // 4. Insertar la asignación en ExamenControlador
    const nuevo = await this.prisma.examenControlador.create({
      data: {
        examenId,
        colaboradorId: colId,
        asignadoPor: docenteId ?? examen.usuarioId,
        rolAsignacion: 'Control principal',
      },
    });

    return { asignado: true, id: nuevo.id };
  }

  /**
   * HU13: Desasigna un colaborador de un examen futuro antes de su inicio.
   */
  async desasignarControlador(examenId: number, colaboradorId: number) {
    let colId = colaboradorId;
    if (this.prisma.docenteColaborador?.findUnique) {
      const rel = await this.prisma.docenteColaborador.findUnique({
        where: { id: colaboradorId },
      });
      if (rel && rel.colaboradorId) {
        colId = rel.colaboradorId;
      }
    }

    // 1. Verificar si existe la asignación
    const asignacion = await this.prisma.examenControlador.findFirst({
      where: { examenId, colaboradorId: colId },
    });

    if (!asignacion) {
      throw new NotFoundException(
        'El colaborador no está asignado a este examen.',
      );
    }

    // 2. Verificar estado y temporalidad del examen
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      include: {
        reservaAmbiente: {
          include: { horarioFijo: true },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado.');
    }

    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException(
        'No es posible retirar al colaborador: El examen ya finalizó.',
      );
    }

    if (examen.estado === EstadoExamen.EN_CURSO) {
      throw new BadRequestException(
        'No es posible retirar al colaborador: El examen ya inició.',
      );
    }

    if (examen.reservaAmbiente?.fecha) {
      const fechaBase = new Date(examen.reservaAmbiente.fecha);
      const fechaInicio = new Date(fechaBase);

      if (examen.reservaAmbiente.horarioFijo?.horaIni) {
        const hIni = new Date(examen.reservaAmbiente.horarioFijo.horaIni);
        fechaInicio.setUTCHours(hIni.getUTCHours(), hIni.getUTCMinutes(), 0, 0);
      }

      if (Date.now() >= fechaInicio.getTime()) {
        throw new BadRequestException(
          'No es posible retirar al colaborador: El examen ya inició.',
        );
      }
    }

    // 3. Eliminar asignación
    await this.prisma.examenControlador.delete({
      where: { id: asignacion.id },
    });

    return { removido: true };
  }

  /**
   * HU13: Lista exámenes asignados y disponibles de un colaborador para el modal de gestión.
   */
  async getExamenesColaborador(colaboradorId: number, docenteId: number) {
    let colId = colaboradorId;
    let colaborador = await this.prisma.usuario.findUnique({
      where: { id: colId },
      select: { id: true, nombre: true, apellido: true, correo: true },
    });

    if (!colaborador && this.prisma.docenteColaborador?.findUnique) {
      const rel = await this.prisma.docenteColaborador.findUnique({
        where: { id: colaboradorId },
        include: { colaborador: true },
      });
      if (rel?.colaborador) {
        colaborador = rel.colaborador;
        colId = colaborador.id;
      }
    }

    if (!colaborador) {
      throw new NotFoundException('Colaborador no encontrado.');
    }

    // Obtener todos los exámenes del docente que no estén cancelados
    const examenesDocente = await this.prisma.examen.findMany({
      where: {
        usuarioId: docenteId,
        estado: { not: EstadoExamen.CANCELADO },
      },
      include: {
        reservaAmbiente: {
          include: {
            ambiente: true,
            horarioFijo: true,
          },
        },
        carrerasMaterias: {
          include: {
            carrera_materia: {
              include: { materia: true },
            },
          },
        },
        controladores: true,
      },
      orderBy: {
        reservaAmbiente: { fecha: 'asc' },
      },
    });

    // Separar en asignados y disponibles
    const asignados: any[] = [];
    const disponibles: any[] = [];

    // Todas las asignaciones activas de este colaborador (en cualquier examen/docente) para chequear choques
    const asignacionesTotales = await this.prisma.examenControlador.findMany({
      where: { colaboradorId: colId },
      include: {
        examen: {
          include: {
            reservaAmbiente: { include: { horarioFijo: true } },
          },
        },
      },
    });

    const ahora = Date.now();

    for (const ex of examenesDocente) {
      const estaAsignado = ex.controladores.some(
        (c: { colaboradorId: number }) => c.colaboradorId === colId,
      );

      const fechaBase = ex.reservaAmbiente?.fecha
        ? new Date(ex.reservaAmbiente.fecha)
        : new Date();
      const fechaIso = fechaBase.toISOString().split('T')[0];

      const horaIni = ex.reservaAmbiente?.horarioFijo?.horaIni
        ? new Date(ex.reservaAmbiente.horarioFijo.horaIni)
        : null;
      let fechaInicioMs = fechaBase.getTime();
      if (horaIni) {
        const d = new Date(fechaBase);
        d.setUTCHours(horaIni.getUTCHours(), horaIni.getUTCMinutes(), 0, 0);
        fechaInicioMs = d.getTime();
      }

      const yaInicio =
        ex.estado === EstadoExamen.FINALIZADO ||
        ex.estado === EstadoExamen.EN_CURSO ||
        ahora >= fechaInicioMs;

      const materiaNombre =
        ex.carrerasMaterias[0]?.carrera_materia?.materia?.nombre ||
        'Examen programado';
      const periodoNombre =
        ex.reservaAmbiente?.horarioFijo?.periodoNombre || 'Periodo';
      const horarioStr = ex.reservaAmbiente?.horarioFijo
        ? `${this.formatearHora(ex.reservaAmbiente.horarioFijo.horaIni)}–${this.formatearHora(ex.reservaAmbiente.horarioFijo.horaFin)}`
        : 'Horario';
      const ubicacionStr = ex.reservaAmbiente?.ambiente
        ? ex.reservaAmbiente.ambiente.nombre
        : 'Ambiente no asignado';

      const itemFormateado = {
        id: ex.id,
        materia: materiaNombre,
        parcial: ex.tipoExamen,
        fecha: this.formatearFecha(fechaBase),
        fechaIso,
        periodo: periodoNombre,
        horario: horarioStr,
        ubicacion: ubicacionStr,
        yaInicio,
      };

      if (estaAsignado) {
        asignados.push(itemFormateado);
      } else {
        // Evaluar choque de horario contra asignaciones totales del colaborador
        let tieneChoque = false;
        let motivoChoque: string | undefined;

        for (const asig of asignacionesTotales) {
          const asigFecha = asig.examen?.reservaAmbiente?.fecha
            ? new Date(asig.examen.reservaAmbiente.fecha)
                .toISOString()
                .split('T')[0]
            : null;
          const asigHorarioId = asig.examen?.reservaAmbiente?.horarioFijoId;

          if (fechaIso && asigFecha && fechaIso === asigFecha) {
            if (
              ex.reservaAmbiente?.horarioFijoId &&
              asigHorarioId &&
              ex.reservaAmbiente.horarioFijoId === asigHorarioId
            ) {
              tieneChoque = true;
              motivoChoque = `Choque de horario`;
              break;
            }
          }
        }

        disponibles.push({
          ...itemFormateado,
          tieneChoque,
          motivoChoque,
        });
      }
    }

    return {
      colaborador: {
        id: colaborador.id,
        nombreCompleto:
          `${colaborador.nombre} ${colaborador.apellido || ''}`.trim(),
        email: colaborador.correo,
      },
      asignados,
      disponibles,
    };
  }

  private formatearFecha(fecha: Date): string {
    const meses = [
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
    const d = String(fecha.getDate()).padStart(2, '0');
    const m = meses[fecha.getMonth()];
    const y = fecha.getFullYear();
    return `${d} ${m} ${y}`;
  }

  private formatearHora(hora: Date): string {
    const h = String(hora.getUTCHours()).padStart(2, '0');
    const min = String(hora.getUTCMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
}
