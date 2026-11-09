import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsistenciaPdfService } from './asistencia-pdf.service';

// Bolivia = UTC-4. fechaHora se guarda como Timestamp (UTC).
const aBolivia = (d: Date) =>
  new Date(d.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 19) + '-04:00';

const incluirControl = {
  reservaAmbiente: {
    include: {
      ambiente: true,
      horarioFijo: true,
    },
  },
  carrerasMaterias: {
    include: {
      carrera_materia: {
        include: {
          materia: true,
          carrera: {
            include: {
              facultad: true,
            },
          },
        },
      },
    },
  },
  responsable: true,
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

    return usuario.roles.some((r) => {
      const nombre = r.rol.nombre.toUpperCase();
      return (
        nombre === 'ADMIN' ||
        nombre === 'ADMINISTRADOR' ||
        nombre.includes('ADMIN')
      );
    });
  }

  /** Exámenes que el usuario puede controlar; el del día primero. */
  async examenesControl(usuarioId: number) {
    const esAdmin = await this.verificarEsAdmin(usuarioId);
    const where = esAdmin ? {} : this.puedeControlar(usuarioId);

    const examenes = await this.prisma.examen.findMany({
      where,
      include: incluirControl,
    });
    const hoy = new Date().toISOString().slice(0, 10);

    return examenes
      .map((ex) => {
        const cm = ex.carrerasMaterias[0]?.carrera_materia;
        const materiaNombre = cm?.materia.nombre ?? 'Examen';
        const carreraNombre = cm?.carrera.nombre ?? 'Sin Carrera';
        const facultadNombre = cm?.carrera.facultad.nombre ?? 'Sin Facultad';
        const docenteNombre = ex.responsable
          ? `${ex.responsable.nombre} ${ex.responsable.apellido ?? ''}`.trim()
          : 'Docente';
        const fechaStr = ex.reservaAmbiente.fecha.toISOString().slice(0, 10);
        const mes = ex.reservaAmbiente.fecha.getUTCMonth() + 1;
        const gestion = mes <= 6 ? 'Gestión 1/2026' : 'Gestión 2/2026';

        let horario = '08:00 - 09:30';
        if (ex.reservaAmbiente.horarioFijo) {
          const hIni = ex.reservaAmbiente.horarioFijo.horaIni
            ? new Date(ex.reservaAmbiente.horarioFijo.horaIni)
                .toISOString()
                .slice(11, 16)
            : '08:00';
          const hFin = ex.reservaAmbiente.horarioFijo.horaFin
            ? new Date(ex.reservaAmbiente.horarioFijo.horaFin)
                .toISOString()
                .slice(11, 16)
            : '09:30';
          horario = `${hIni} - ${hFin}`;
        }

        return {
          id: ex.id,
          nombre: this.nombreExamen(ex),
          fecha: fechaStr,
          facultad: facultadNombre,
          facultadId: cm?.carrera.facultadId ?? 1,
          carrera: carreraNombre,
          carreraId: cm?.carreraId ?? 1,
          materia: materiaNombre,
          materiaId: cm?.materiaId ?? 1,
          docente: docenteNombre,
          docenteId: ex.usuarioId,
          gestion,
          ambiente: ex.reservaAmbiente.ambiente?.nombre ?? 'Aula',
          horario,
          estado: ex.estado,
        };
      })
      .sort((a, b) => {
        const ra = a.fecha === hoy ? 0 : 1;
        const rb = b.fecha === hoy ? 0 : 1;
        return ra - rb || a.fecha.localeCompare(b.fecha);
      });
  }

  async ingresos(examenId: number, usuarioId: number) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: { id: true, usuarioId: true },
    });
    if (!examen) throw new NotFoundException('El examen no existe');

    const asignado = await this.prisma.examen.findFirst({
      where: { id: examenId, ...this.puedeControlar(usuarioId) },
      select: { id: true },
    });
    const esAdmin = await this.verificarEsAdmin(usuarioId);

    if (!asignado && !esAdmin) {
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
   * HU17: Genera el documento PDF con la nómina de ingresos del examen (solo ingresados).
   * Restringido exclusivamente al docente responsable del examen o rol Administrador.
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

    // Criterio 21 y 22: Acceso exclusivo para el docente responsable o admin (403 para colaboradores o ajenos)
    const esDocenteResponsable = examen.usuarioId === usuarioId;
    if (!esDocenteResponsable) {
      const esAdmin = await this.verificarEsAdmin(usuarioId);
      if (!esAdmin) {
        throw new ForbiddenException(
          'No tienes permiso para descargar el reporte de este examen.',
        );
      }
    }

    // Criterios 14, 15 y 16: Obtener solo los ingresos registrados, cruzados con habilitaciones e incidencias
    const [ingresosDb, habilitaciones, incidencias] = await Promise.all([
      this.prisma.ingreso.findMany({
        where: { examenId },
        orderBy: { fechaHora: 'asc' },
        include: { estudiante: true },
      }),
      this.prisma.examen_Estudiante.findMany({
        where: { examenId },
        select: { estudianteId: true, estado_habilitado: true },
      }),
      this.prisma.incidenciaIngreso.findMany({
        where: { examenId },
        select: { estudianteId: true, descripcion: true },
      }),
    ]);

    // Criterio 8 y Escenario Negativo 2: Si no hay ingresos, no se genera el archivo
    if (ingresosDb.length === 0) {
      throw new BadRequestException(
        'No hay ingresos registrados para descargar.',
      );
    }

    const incidenciaMap = new Map<number, string>();
    for (const inc of incidencias) {
      if (inc.estudianteId && inc.descripcion) {
        incidenciaMap.set(inc.estudianteId, inc.descripcion);
      }
    }

    const habilMap = new Map<number, boolean>(
      habilitaciones.map((h) => [h.estudianteId, h.estado_habilitado]),
    );

    // Un solo ingreso por estudiante: se conserva el primero registrado
    const unicos = new Map<number, (typeof ingresosDb)[number]>();
    for (const i of ingresosDb) {
      if (!unicos.has(i.estudianteId)) unicos.set(i.estudianteId, i);
    }

    const ingresosOrdenados = [...unicos.values()].sort((a, b) => {
      const apA = (a.estudiante.apellido ?? '').toLowerCase();
      const apB = (b.estudiante.apellido ?? '').toLowerCase();
      if (apA !== apB) return apA.localeCompare(apB);
      return a.estudiante.nombre
        .toLowerCase()
        .localeCompare(b.estudiante.nombre.toLowerCase());
    });

    const items = ingresosOrdenados.map((ing, idx) => {
      const fechaIng = new Date(ing.fechaHora);
      const horaStr = fechaIng.toLocaleTimeString('en-US', {
        timeZone: 'America/La_Paz',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const esHabil = habilMap.get(ing.estudianteId) !== false;
      const excepcion = incidenciaMap.get(ing.estudianteId) ?? '-';

      return {
        numero: idx + 1,
        hora: horaStr,
        codSis: String(ing.estudiante.cod_sis),
        estudiante:
          `${ing.estudiante.apellido ?? ''} ${ing.estudiante.nombre}`.trim(),
        metodo: ing.metodo.toUpperCase() === 'QR' ? 'QR' : 'Manual',
        estado: esHabil ? 'Ingresado' : 'Inhabilitado',
        casoExcepcional: excepcion,
      };
    });

    const totalHabilitados = habilitaciones.filter(
      (h) => h.estado_habilitado,
    ).length;
    const totalIngresos = items.length;
    const porcentajeAsistencia =
      totalHabilitados > 0
        ? Math.round((totalIngresos / totalHabilitados) * 100)
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
      totalIngresos,
      porcentajeAsistencia,
      fechaGeneracion: ahoraBolivia,
      ingresos: items,
    };

    const buffer = await this.pdfService.generarPdf(pdfData);

    // Criterio 23: Nombre en formato ingresos_[Materia]_[TipoExamen]_[DD-MM-YYYY].pdf en PascalCase
    const aPascalCase = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join('');

    const mat = aPascalCase(cm?.materia?.nombre ?? 'Materia');
    const tipo = aPascalCase(examen.tipoExamen ?? 'Examen');
    const partes = fechaStr.split('-');
    const fechaFormateada =
      partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fechaStr;
    const filename = `ingresos_${mat}_${tipo}_${fechaFormateada}.pdf`;

    return { buffer, filename };
  }
}
