import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  estadoCasoExamen,
  filaRegistroIngreso,
} from './casos-excepcionales.service';

const incluirNombre = {
  reservaAmbiente: { include: { horarioFijo: true, ambiente: true } },
  carrerasMaterias: {
    include: { carrera_materia: { include: { materia: true } } },
  },
} as const;

@Injectable()
export class ConsultaCasosExcepcionalesService {
  constructor(private readonly prisma: PrismaService) {}

  private nombreExamen(ex: {
    tipoExamen: string;
    carrerasMaterias: { carrera_materia: { materia: { nombre: string } } }[];
  }) {
    const materia =
      ex.carrerasMaterias[0]?.carrera_materia.materia.nombre ?? 'Examen';
    return `${materia} – ${ex.tipoExamen}`;
  }

  /** Examen controlable: asignado como controlador O responsable (docente). */
  private puedeControlar(usuarioId: number) {
    return {
      OR: [
        { controladores: { some: { colaboradorId: usuarioId } } },
        { usuarioId }, // responsable del examen
      ],
    };
  }

  /** Exámenes que el usuario puede controlar; el del día primero. */
  async examenesControl(usuarioId: number) {
    const examenes = await this.prisma.examen.findMany({
      where: {
        ...this.puedeControlar(usuarioId),
        estado: { not: 'CANCELADO' },
        reservaAmbiente: { estado: { not: 'CANCELADO' } },
      },
      include: incluirNombre,
    });
    const hoy = new Date().toISOString().slice(0, 10);

    return examenes
      .map((ex) => ({
        id: ex.id,
        nombre: this.nombreExamen(ex),
        fecha: ex.reservaAmbiente.fecha.toISOString().slice(0, 10),
        estado: estadoCasoExamen(ex),
        ambiente: ex.reservaAmbiente.ambiente.nombre,
        horario: `${ex.reservaAmbiente.horarioFijo.horaIni.toISOString().slice(11, 16)}-${ex.reservaAmbiente.horarioFijo.horaFin.toISOString().slice(11, 16)}`,
      }))
      .sort((a, b) => {
        const ra = a.fecha === hoy ? 0 : 1;
        const rb = b.fecha === hoy ? 0 : 1;
        return ra - rb || a.fecha.localeCompare(b.fecha);
      });
  }

  async ingresos(examenId: number, usuarioId: number) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: { id: true },
    });
    if (!examen) throw new NotFoundException('El examen no existe');

    const permitido = await this.prisma.examen.findFirst({
      where: { id: examenId, ...this.puedeControlar(usuarioId) },
      select: { id: true },
    });
    if (!permitido) {
      throw new ForbiddenException(
        'No tienes permiso para controlar este examen.',
      );
    }

    const [total, ingresosDb, habilitaciones] = await Promise.all([
      this.prisma.examen_Estudiante.count({
        where: { examenId, estado_habilitado: true },
      }),
      this.prisma.ingreso.findMany({
        where: { examenId },
        orderBy: { fechaHora: 'asc' },
        include: { estudiante: true },
      }),
      this.prisma.examen_Estudiante.findMany({
        where: { examenId },
        select: { estudianteId: true, estado_habilitado: true },
      }),
    ]);

    const habil = new Map(
      habilitaciones.map((h) => [h.estudianteId, h.estado_habilitado]),
    );

    // Un solo ingreso por estudiante: se conserva el primero
    const unicos = new Map<number, (typeof ingresosDb)[number]>();
    for (const i of ingresosDb) {
      if (!unicos.has(i.estudianteId)) unicos.set(i.estudianteId, i);
    }

    const ingresos = [...unicos.values()]
      .reverse() // del más reciente al más antiguo
      .map((i) => filaRegistroIngreso(i, habil.get(i.estudianteId) !== false));

    return { examenId, ingresados: ingresos.length, total, ingresos };
  }
  async estudiantes(
    examenId: number,
    query: string | undefined,
    usuarioId: number,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: { id: true },
    });
    if (!examen) throw new NotFoundException('El examen no existe');
    const permitido = await this.prisma.examen.findFirst({
      where: { id: examenId, ...this.puedeControlar(usuarioId) },
      select: { id: true },
    });
    if (!permitido)
      throw new ForbiddenException(
        'No tienes acceso a los estudiantes de este examen.',
      );
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
              timeZone: 'America/La_Paz',
            })
          : undefined,
        casoExcepcionalPrevio: ultimoIngreso?.casoExcepcional ?? null,
        metodoIngresoPrevio: ultimoIngreso?.metodo as
          'QR' | 'MANUAL' | undefined,
      };
    });
  }
}
