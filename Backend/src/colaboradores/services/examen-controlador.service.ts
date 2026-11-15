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
    examenIdInput: number | string,
    colaboradorIdInput: number | string,
    docenteIdInput?: number | string,
  ) {
    const examenId = Number(examenIdInput);
    let colId = Number(colaboradorIdInput);
    const docenteId = docenteIdInput ? Number(docenteIdInput) : undefined;

    // Buscar si el ID enviado corresponde a la relación DocenteColaborador
    const relDirect = await this.prisma.docenteColaborador.findFirst({
      where: {
        id: colId,
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

    // 3. Validar estado del examen
    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException(
        'No se puede asignar a un examen que ya finalizó.',
      );
    }
    if (examen.estado === EstadoExamen.CANCELADO) {
      throw new BadRequestException(
        'No se puede asignar a un examen cancelado.',
      );
    }

    // 4. Algoritmo de detección de colisión y choque de horarios
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
      if (asig.examenId === examenId) continue;

      const asigFecha = asig.examen?.reservaAmbiente?.fecha
        ? new Date(asig.examen.reservaAmbiente.fecha)
            .toISOString()
            .split('T')[0]
        : null;
      const asigHorarioId = asig.examen?.reservaAmbiente?.horarioFijoId;

      if (fechaNuevo && asigFecha && fechaNuevo === asigFecha) {
        if (
          horarioNuevoId &&
          asigHorarioId &&
          horarioNuevoId === asigHorarioId
        ) {
          throw new ConflictException(
            'Choque de horario detectado con otro examen asignado.',
          );
        }

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

    // 5. Insertar la asignación en ExamenControlador
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
  async desasignarControlador(
    examenIdInput: number | string,
    colaboradorIdInput: number | string,
  ) {
    const examenId = Number(examenIdInput);
    let colId = Number(colaboradorIdInput);

    if (this.prisma.docenteColaborador?.findUnique) {
      const rel = await this.prisma.docenteColaborador.findUnique({
        where: { id: colId },
      });
      if (rel && rel.colaboradorId) {
        colId = rel.colaboradorId;
      }
    }

    const asignacion = await this.prisma.examenControlador.findFirst({
      where: { examenId, colaboradorId: colId },
    });

    if (!asignacion) {
      throw new NotFoundException(
        'El colaborador no está asignado a este examen.',
      );
    }

    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado.');
    }

    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException(
        'No es posible retirar al colaborador: El examen ya finalizó.',
      );
    }

    await this.prisma.examenControlador.delete({
      where: { id: asignacion.id },
    });

    return { removido: true };
  }

  /**
   * HU13: Lista exámenes asignados y disponibles de un colaborador para el modal de gestión.
   */
  async getExamenesColaborador(
    colaboradorIdInput: number | string,
    docenteIdInput: number | string,
  ) {
    let colId = Number(colaboradorIdInput);
    const docenteId = Number(docenteIdInput);

    let colaborador = await this.prisma.usuario.findUnique({
      where: { id: colId },
      select: { id: true, nombre: true, apellido: true, correo: true },
    });

    if (!colaborador && this.prisma.docenteColaborador?.findUnique) {
      const rel = await this.prisma.docenteColaborador.findUnique({
        where: { id: colId },
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

    // Obtener exámenes del docente no cancelados
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

    const asignados: any[] = [];
    const disponibles: any[] = [];

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
      const fechaInicioMs = this.calcularFechaInicioMs(
        ex.reservaAmbiente?.fecha,
        ex.reservaAmbiente?.horarioFijo?.horaIni,
      );

      const yaInicio =
        ex.estado === EstadoExamen.FINALIZADO ||
        ex.estado === EstadoExamen.EN_CURSO ||
        (fechaInicioMs !== null && ahora >= fechaInicioMs);

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
      } else if (ex.estado === EstadoExamen.PROGRAMADO) {
        // Muestra en disponibles todos los exámenes en estado PROGRAMADO
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
              motivoChoque = 'Choque de horario';
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

  private calcularFechaInicioMs(
    fechaRaw?: Date | string | null,
    horaIniRaw?: Date | string | null,
  ): number | null {
    if (!fechaRaw) return null;

    const fechaObj = new Date(fechaRaw);
    const isoStr = fechaObj.toISOString().split('T')[0];
    const [year, month, day] = isoStr.split('-').map(Number);

    let hours = 0;
    let minutes = 0;

    if (horaIniRaw) {
      const horaObj = new Date(horaIniRaw);
      hours = horaObj.getUTCHours();
      minutes = horaObj.getUTCMinutes();
    }

    // Calcula la fecha de inicio local respetando el huso horario local
    const fechaInicioLocal = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0,
      0,
    );
    return fechaInicioLocal.getTime();
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
    const isoStr = fecha.toISOString().split('T')[0];
    const [y, m, d] = isoStr.split('-').map(Number);
    const mesNombre = meses[m - 1] || 'ene';
    const dStr = String(d).padStart(2, '0');
    return `${dStr} ${mesNombre} ${y}`;
  }

  private formatearHora(hora: Date | string): string {
    const hObj = new Date(hora);
    const h = String(hObj.getUTCHours()).padStart(2, '0');
    const min = String(hObj.getUTCMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
}
