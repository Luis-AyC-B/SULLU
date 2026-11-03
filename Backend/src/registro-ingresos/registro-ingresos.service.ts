import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsistenciaPdfService } from './asistencia-pdf.service';

// Bolivia = UTC-4. fechaHora se guarda como Timestamp (UTC).
const aBolivia = (d: Date) =>
  new Date(d.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 19) + '-04:00';

const incluirNombre = {
  reservaAmbiente: true,
  carrerasMaterias: {
    include: { carrera_materia: { include: { materia: true } } },
  },
} as const;

@Injectable()
export class RegistroIngresosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: AsistenciaPdfService,
  ) {}

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

  /** Verifica si el usuario es controlador asignado, docente responsable o administrador */
  private async puedeControlarOAdmin(
    usuarioId: number,
    examenId: number,
  ): Promise<boolean> {
    const asignado = await this.prisma.examen.findFirst({
      where: { id: examenId, ...this.puedeControlar(usuarioId) },
      select: { id: true },
    });
    if (asignado) return true;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        roles: {
          include: { rol: true },
        },
      },
    });
    if (!usuario) return false;

    return usuario.roles.some((r) => {
      const nombre = r.rol.nombre.toUpperCase();
      return nombre === 'ADMIN' || nombre === 'ADMINISTRADOR';
    });
  }

  /** Exámenes que el usuario puede controlar; el del día primero. */
  async examenesControl(usuarioId: number) {
    const examenes = await this.prisma.examen.findMany({
      where: this.puedeControlar(usuarioId),
      include: incluirNombre,
    });
    const hoy = new Date().toISOString().slice(0, 10);

    return examenes
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

  async ingresos(examenId: number, usuarioId: number) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: { id: true },
    });
    if (!examen) throw new NotFoundException('El examen no existe');

    const tienePermiso = await this.puedeControlarOAdmin(usuarioId, examenId);
    if (!tienePermiso) {
      throw new ForbiddenException(
        'No tienes permiso para controlar este examen.',
      );
    }

    const [total, ingresosDb, habilitaciones] = await Promise.all([
      this.prisma.examen_Estudiante.count({ where: { examenId } }),
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
      .map((i) => ({
        id: i.id,
        hora: aBolivia(i.fechaHora),
        sis: String(i.estudiante.cod_sis),
        estudiante:
          `${i.estudiante.nombre} ${i.estudiante.apellido ?? ''}`.trim(),
        metodo: i.metodo.toUpperCase() === 'QR' ? 'QR' : 'Manual',
        estado:
          habil.get(i.estudianteId) === false ? 'Inhabilitado' : 'Habilitado',
      }));

    return { examenId, ingresados: ingresos.length, total, ingresos };
  }

  /**
   * HU17: Genera el documento PDF de reporte de asistencia del examen y retorna el Buffer y nombre de archivo.
   */
  async generarReportePdf(
    examenId: number,
    usuarioId: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
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
                carrera: true,
              },
            },
          },
        },
      },
    });

    if (!examen) {
      throw new NotFoundException('El examen no existe.');
    }

    const tienePermiso = await this.puedeControlarOAdmin(usuarioId, examenId);
    if (!tienePermiso) {
      throw new ForbiddenException(
        'No tienes permiso para generar el reporte de este examen.',
      );
    }

    // 1. Obtener lista de estudiantes asignados al examen ordenados por apellido
    const examenEstudiantes = await this.prisma.examen_Estudiante.findMany({
      where: { examenId },
      include: {
        estudiante: true,
      },
      orderBy: [
        { estudiante: { apellido: 'asc' } },
        { estudiante: { nombre: 'asc' } },
      ],
    });

    // 2. Obtener ingresos registrados para este examen
    const ingresosDb = await this.prisma.ingreso.findMany({
      where: { examenId },
      orderBy: { fechaHora: 'asc' },
    });

    const primerIngresoMap = new Map<number, (typeof ingresosDb)[number]>();
    for (const ing of ingresosDb) {
      if (!primerIngresoMap.has(ing.estudianteId)) {
        primerIngresoMap.set(ing.estudianteId, ing);
      }
    }

    // 3. Mapear nómina con detalle de asistencia
    const estudiantesItems = examenEstudiantes.map((ee, idx) => {
      const ingreso = primerIngresoMap.get(ee.estudianteId);
      const asistio = !!ingreso;

      let horaIngreso = '-';
      let metodo = '-';

      if (ingreso) {
        const fechaIng = new Date(ingreso.fechaHora);
        horaIngreso = fechaIng.toLocaleTimeString('en-US', {
          timeZone: 'America/La_Paz',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        metodo = ingreso.metodo.toUpperCase() === 'QR' ? 'QR' : 'Manual';
      }

      return {
        numero: idx + 1,
        codSis: String(ee.estudiante.cod_sis),
        estudiante:
          `${ee.estudiante.apellido ?? ''} ${ee.estudiante.nombre}`.trim(),
        habilitado: ee.estado_habilitado,
        asistio,
        horaIngreso,
        metodo,
      };
    });

    // 4. Métricas globales
    const totalHabilitados = examenEstudiantes.filter(
      (e) => e.estado_habilitado,
    ).length;
    const totalPresentes = examenEstudiantes.filter(
      (e) => e.estado_habilitado && primerIngresoMap.has(e.estudianteId),
    ).length;
    const totalAusentes = Math.max(0, totalHabilitados - totalPresentes);
    const porcentajeAsistencia =
      totalHabilitados > 0
        ? Math.round((totalPresentes / totalHabilitados) * 100)
        : 0;

    const cm = examen.carrerasMaterias?.[0]?.carrera_materia;
    const resAmb = examen.reservaAmbiente;
    const horFijo = resAmb?.horarioFijo;

    const horaIniStr = horFijo?.horaIni
      ? horFijo.horaIni.toISOString().substring(11, 16)
      : '08:00';
    const horaFinStr = horFijo?.horaFin
      ? horFijo.horaFin.toISOString().substring(11, 16)
      : '09:30';

    const fechaStr = resAmb?.fecha
      ? new Date(resAmb.fecha).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const ahoraBolivia = new Date().toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const pdfData = {
      examenId: examen.id,
      materia: cm?.materia?.nombre ?? 'Materia General',
      tipoExamen: examen.tipoExamen ?? 'Examen Programado',
      carrera: cm?.carrera?.nombre ?? 'Carrera no especificada',
      docente: examen.responsable
        ? `${examen.responsable.nombre} ${examen.responsable.apellido ?? ''}`.trim()
        : 'Docente no asignado',
      ambiente: resAmb?.ambiente?.nombre ?? 'Ambiente no asignado',
      fecha: fechaStr,
      horario: `${horaIniStr} - ${horaFinStr}`,
      totalHabilitados,
      totalPresentes,
      totalAusentes,
      porcentajeAsistencia,
      fechaGeneracion: ahoraBolivia,
      estudiantes: estudiantesItems,
    };

    const buffer = await this.pdfService.generarPdf(pdfData);
    const sanitizedMateria = (cm?.materia?.nombre ?? 'examen')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const filename = `reporte-asistencia-${sanitizedMateria}-${fechaStr}.pdf`;

    return { buffer, filename };
  }
}
