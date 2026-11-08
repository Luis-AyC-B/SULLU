import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EstudianteParticion {
  id: number;
  codSis: string;
  ci: string;
  nombre: string;
  apellido: string;
}

export interface GrupoControladorParticion {
  colaboradorId: number;
  nombreControlador: string;
  emailControlador: string;
  rolAsignacion: string;
  rango: string;
  letraInicio: string;
  letraFin: string;
  totalEstudiantes: number;
  estudianteIds: number[];
  estudiantes: EstudianteParticion[];
}

export interface ResumenParticionExamen {
  examenId: number;
  totalControladores: number;
  totalEstudiantesHabilitados: number;
  grupos: GrupoControladorParticion[];
}

export interface ValidacionGrupoEstudiante {
  pertenece: boolean;
  grupoAsignado?: GrupoControladorParticion;
  grupoCorrecto?: GrupoControladorParticion;
  mensaje?: string;
}

@Injectable()
export class ParticionControladorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula la partición alfabética equitativa de estudiantes habilitados
   * entre los controladores asignados a un examen.
   */
  async calcularParticion(examenId: number): Promise<ResumenParticionExamen> {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: { id: true },
    });

    if (!examen) {
      throw new NotFoundException(`Examen con ID ${examenId} no encontrado`);
    }

    const [controladores, inscripciones] = await Promise.all([
      this.prisma.examenControlador.findMany({
        where: { examenId },
        include: {
          colaborador: {
            select: { id: true, nombre: true, apellido: true, correo: true },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.examen_Estudiante.findMany({
        where: { examenId, estado_habilitado: true },
        include: {
          estudiante: {
            select: {
              id: true,
              cod_sis: true,
              ci: true,
              nombre: true,
              apellido: true,
            },
          },
        },
      }),
    ]);

    const estudiantesMapeados: EstudianteParticion[] = inscripciones.map(
      (ie) => ({
        id: ie.estudiante.id,
        codSis: ie.estudiante.cod_sis,
        ci: ie.estudiante.ci || '',
        nombre: ie.estudiante.nombre,
        apellido: ie.estudiante.apellido || '',
      }),
    );

    // Ordenamiento alfabético por apellido (asc), luego por nombre (asc)
    const normalizar = (txt?: string): string =>
      (txt ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    estudiantesMapeados.sort((a, b) => {
      const compAp = normalizar(a.apellido).localeCompare(
        normalizar(b.apellido),
      );
      if (compAp !== 0) return compAp;
      return normalizar(a.nombre).localeCompare(normalizar(b.nombre));
    });

    const totalEstudiantes = estudiantesMapeados.length;
    const numControladores = controladores.length;

    // Caso 1: Sin controladores asignados
    if (numControladores === 0) {
      return {
        examenId,
        totalControladores: 0,
        totalEstudiantesHabilitados: totalEstudiantes,
        grupos: [],
      };
    }

    // Caso 2: 1 solo controlador asignado (cubre toda la lista)
    if (numControladores === 1) {
      const c = controladores[0];
      const letraIni =
        totalEstudiantes > 0
          ? this.obtenerLetraInicial(estudiantesMapeados[0])
          : 'A';
      const letraFin =
        totalEstudiantes > 0
          ? this.obtenerLetraInicial(estudiantesMapeados[totalEstudiantes - 1])
          : 'Z';
      const rango =
        totalEstudiantes === 0
          ? 'A - Z'
          : letraIni === letraFin
            ? letraIni
            : `${letraIni} - ${letraFin}`;

      return {
        examenId,
        totalControladores: 1,
        totalEstudiantesHabilitados: totalEstudiantes,
        grupos: [
          {
            colaboradorId: c.colaboradorId,
            nombreControlador:
              `${c.colaborador.nombre} ${c.colaborador.apellido ?? ''}`.trim(),
            emailControlador: c.colaborador.correo ?? '',
            rolAsignacion: c.rolAsignacion,
            rango,
            letraInicio: letraIni,
            letraFin: letraFin,
            totalEstudiantes,
            estudianteIds: estudiantesMapeados.map((e) => e.id),
            estudiantes: estudiantesMapeados,
          },
        ],
      };
    }

    // Caso 3: Múltiples controladores (N >= 2): división equitativa en N chunks contiguos
    const baseSize = Math.floor(totalEstudiantes / numControladores);
    const residuo = totalEstudiantes % numControladores;

    const grupos: GrupoControladorParticion[] = [];
    let indiceActual = 0;

    for (let i = 0; i < numControladores; i++) {
      const c = controladores[i];
      const tamanoGrupo = baseSize + (i < residuo ? 1 : 0);
      const estudiantesGrupo = estudiantesMapeados.slice(
        indiceActual,
        indiceActual + tamanoGrupo,
      );
      indiceActual += tamanoGrupo;

      let letraIni = '-';
      let letraFin = '-';
      let rango = '-';

      if (estudiantesGrupo.length > 0) {
        letraIni = this.obtenerLetraInicial(estudiantesGrupo[0]);
        letraFin = this.obtenerLetraInicial(
          estudiantesGrupo[estudiantesGrupo.length - 1],
        );
        rango = letraIni === letraFin ? letraIni : `${letraIni} - ${letraFin}`;
      }

      grupos.push({
        colaboradorId: c.colaboradorId,
        nombreControlador:
          `${c.colaborador.nombre} ${c.colaborador.apellido ?? ''}`.trim(),
        emailControlador: c.colaborador.correo ?? '',
        rolAsignacion: c.rolAsignacion,
        rango,
        letraInicio: letraIni,
        letraFin: letraFin,
        totalEstudiantes: estudiantesGrupo.length,
        estudianteIds: estudiantesGrupo.map((e) => e.id),
        estudiantes: estudiantesGrupo,
      });
    }

    return {
      examenId,
      totalControladores: numControladores,
      totalEstudiantesHabilitados: totalEstudiantes,
      grupos,
    };
  }

  /**
   * Obtiene el grupo específico asignado a un controlador dentro de un examen.
   */
  async obtenerGrupoDeControlador(
    examenId: number,
    colaboradorId: number,
  ): Promise<GrupoControladorParticion | null> {
    const particion = await this.calcularParticion(examenId);
    return (
      particion.grupos.find((g) => g.colaboradorId === colaboradorId) ?? null
    );
  }

  /**
   * Valida si un estudiante pertenece al grupo asignado a un controlador.
   * Si no pertenece, indica el grupo y controlador correcto al que debe dirigirse.
   */
  async validarEstudianteEnGrupo(
    examenId: number,
    colaboradorId: number,
    estudianteId: number,
  ): Promise<ValidacionGrupoEstudiante> {
    const particion = await this.calcularParticion(examenId);

    // Si hay 1 o 0 controladores, no hay restricción de partición entre filas
    if (particion.totalControladores <= 1) {
      const grupoUnico = particion.grupos[0];
      return {
        pertenece: true,
        grupoAsignado: grupoUnico,
      };
    }

    const grupoControlador = particion.grupos.find(
      (g) => g.colaboradorId === colaboradorId,
    );

    // Si el usuario no es un controlador con grupo asignado en este examen
    if (!grupoControlador) {
      return {
        pertenece: false,
        mensaje: 'No tienes un grupo de control asignado en este examen.',
      };
    }

    // Verificar si el estudiante está en su grupo
    if (grupoControlador.estudianteIds.includes(estudianteId)) {
      return {
        pertenece: true,
        grupoAsignado: grupoControlador,
      };
    }

    // El estudiante está en otro grupo
    const grupoCorrecto = particion.grupos.find((g) =>
      g.estudianteIds.includes(estudianteId),
    );

    const estudiante = grupoCorrecto?.estudiantes.find(
      (e) => e.id === estudianteId,
    );
    const nombreEstudiante = estudiante
      ? `${estudiante.apellido} ${estudiante.nombre}`.trim()
      : 'El estudiante';

    const detalleDestino = grupoCorrecto
      ? `Debe dirigirse al controlador ${grupoCorrecto.nombreControlador} (Fila/Rango ${grupoCorrecto.rango})`
      : 'no se encuentra asignado a ningún grupo habilitado';

    return {
      pertenece: false,
      grupoAsignado: grupoControlador,
      grupoCorrecto,
      mensaje: `${nombreEstudiante} no pertenece a tu grupo asignado (Rango ${grupoControlador.rango}). ${detalleDestino}.`,
    };
  }

  private obtenerLetraInicial(estudiante: EstudianteParticion): string {
    const texto = estudiante.apellido || estudiante.nombre || '';
    const limpio = texto
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (limpio.charAt(0) || 'A').toUpperCase();
  }
}
