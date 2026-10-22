import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  private nombreExamen(ex: {
    tipoExamen: string;
    carrerasMaterias: { carrera_materia: { materia: { nombre: string } } }[];
  }) {
    const materia =
      ex.carrerasMaterias[0]?.carrera_materia.materia.nombre ?? 'Examen';
    return `${materia} – ${ex.tipoExamen}`;
  }

  /** Exámenes asignados al usuario; el del día primero. */
  async examenesControl(usuarioId: number) {
    const filas = await this.prisma.examenControlador.findMany({
      where: { colaboradorId: usuarioId },
      include: { examen: { include: incluirNombre } },
    });
    const hoy = new Date().toISOString().slice(0, 10);

    return filas
      .map((f) => ({
        id: f.examen.id,
        nombre: this.nombreExamen(f.examen),
        fecha: f.examen.reservaAmbiente.fecha.toISOString().slice(0, 10),
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

    const asignado = await this.prisma.examenControlador.findUnique({
      where: {
        examenId_colaboradorId: { examenId, colaboradorId: usuarioId },
      },
    });
    if (!asignado) {
      throw new ForbiddenException('No tienes permiso para controlar este examen.');
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
        estudiante: `${i.estudiante.nombre} ${i.estudiante.apellido ?? ''}`.trim(),
        metodo: i.metodo.toUpperCase() === 'QR' ? 'QR' : 'Manual',
        estado: habil.get(i.estudianteId) === false ? 'Inhabilitado' : 'Habilitado',
      }));

    return { examenId, ingresados: ingresos.length, total, ingresos };
  }
}