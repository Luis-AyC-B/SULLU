import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoIncidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  FiltroObservacionesDto,
  MotivoObservacion,
} from './dto/filtro-observaciones.dto';
import {
  ExamenPdfGrupo,
  ObservacionesPdfData,
  ObservacionesPdfService,
} from './observaciones-pdf.service';

const TIMEZONE_BOLIVIA = 'America/La_Paz';

export const ETIQUETAS_MOTIVO: Record<string, string> = {
  NO_HABILITADO: 'No habilitado',
  DOBLE_MARCACION: 'Doble marcación',
  QR_OTRO_EXAMEN: 'QR de otro examen',
  QR_NO_VALIDO: 'QR no válido',
  QR_EXAMEN_VENCIDO: 'QR de examen vencido',
  QR_CADUCADO: 'QR de examen vencido',
  NO_ENCONTRADO: 'No habilitado',
  IDENTIDAD_NO_COINCIDE: 'QR no válido',
};

const formatearHoraBolivia = (date: Date): string =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: TIMEZONE_BOLIVIA,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

const formatearFechaBolivia = (date: Date): string =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(/\//g, '-');

const formatearFechaHoraServidor = (date: Date): string =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: TIMEZONE_BOLIVIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '');

const limpiarCadena = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

const INCLUDE_EXAMEN_COMPLETO = Prisma.validator<Prisma.ExamenInclude>()({
  responsable: true,
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
  reservaAmbiente: {
    include: {
      ambiente: {
        include: {
          facultad: true,
        },
      },
      horarioFijo: true,
    },
  },
  controladores: {
    include: {
      colaborador: true,
    },
  },
});

type ExamenCompleto = Prisma.ExamenGetPayload<{
  include: typeof INCLUDE_EXAMEN_COMPLETO;
}>;

interface GestionInfo {
  gestion: string;
  inicio: Date;
  fin: Date;
}

interface RolPermisosInfo {
  esAdmin: boolean;
  esDocente: boolean;
  esControl: boolean;
  esRolPersonalizado: boolean;
}

@Injectable()
export class ObservacionesIngresoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: ObservacionesPdfService,
  ) {}

  /**
   * Valida la gestión enviada o calcula la gestión vigente del año en curso (2026).
   * Solo admite "Gestión 1/2026" o "Gestión 2/2026". Si es inválida o de otro año, lanza 400 Bad Request.
   */
  private validarGestion(gestion?: string): GestionInfo {
    const anioActual = new Date().getFullYear(); // 2026

    if (!gestion || gestion.trim() === '') {
      const mesActual = new Date().getMonth(); // 0 a 11
      const semestre = mesActual < 6 ? 1 : 2;
      const gestionVigente = `Gestión ${semestre}/${anioActual}`;
      const inicio = new Date(
        Date.UTC(anioActual, semestre === 1 ? 0 : 6, 1, 0, 0, 0, 0),
      );
      const fin = new Date(
        Date.UTC(
          anioActual,
          semestre === 1 ? 5 : 11,
          semestre === 1 ? 30 : 31,
          23,
          59,
          59,
          999,
        ),
      );
      return { gestion: gestionVigente, inicio, fin };
    }

    const regex = /^Gest[ií]ón\s+([12])\/(\d{4})$/i;
    const match = regex.exec(gestion.trim());

    if (!match) {
      throw new BadRequestException(
        'Formato de gestión inválido. Debe ser "Gestión 1/2026" o "Gestión 2/2026"',
      );
    }

    const semestre = Number(match[1]);
    const anio = Number(match[2]);

    if (anio !== anioActual) {
      throw new BadRequestException(
        `Solo se permiten gestiones del año en curso (${anioActual})`,
      );
    }

    const inicio = new Date(
      Date.UTC(anio, semestre === 1 ? 0 : 6, 1, 0, 0, 0, 0),
    );
    const fin = new Date(
      Date.UTC(
        anio,
        semestre === 1 ? 5 : 11,
        semestre === 1 ? 30 : 31,
        23,
        59,
        59,
        999,
      ),
    );

    return {
      gestion: `Gestión ${semestre}/${anio}`,
      inicio,
      fin,
    };
  }

  /**
   * Verifica que el usuario tenga sesión válida y que su rol tenga habilitado
   * el módulo "Registro de ingresos" o el permiso correspondiente.
   */
  private async verificarAccesoModulo(
    user: AuthenticatedUser,
  ): Promise<RolPermisosInfo> {
    if (!user || !user.id) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const rolStr = (user.rol ?? '').toLowerCase();
    const esAdmin =
      rolStr.includes('admin') ||
      (Array.isArray(user.permisos) &&
        user.permisos.includes('auditoria.ver') &&
        user.permisos.includes('roles.ver'));

    if (esAdmin) {
      return {
        esAdmin: true,
        esDocente: false,
        esControl: false,
        esRolPersonalizado: false,
      };
    }

    const usuarioDb = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                modulos: {
                  include: { modulo: true },
                },
                permisos: {
                  include: { permiso: true },
                },
              },
            },
          },
        },
      },
    });

    if (
      usuarioDb &&
      usuarioDb.deletedAt !== null &&
      usuarioDb.deletedAt !== undefined
    ) {
      throw new ForbiddenException('Usuario no autorizado o dado de baja');
    }

    // Verificar si algún rol asignado tiene el módulo "Registro de ingresos" activo o permiso
    const tieneModuloHabilitado = usuarioDb?.roles?.some((ur) => {
      const tieneMod = ur.rol?.modulos?.some(
        (rm) =>
          rm.modulo?.activo &&
          rm.modulo?.nombre.toLowerCase().includes('registro de ingresos'),
      );
      const tienePerm = ur.rol?.permisos?.some(
        (rp) =>
          rp.permiso?.clave === 'registro_ingresos.ver' ||
          rp.permiso?.clave === 'incidencias.ver',
      );
      return Boolean(tieneMod || tienePerm);
    });

    const tienePermisoToken =
      Array.isArray(user.permisos) &&
      (user.permisos.includes('registro_ingresos.ver') ||
        user.permisos.includes('incidencias.ver'));

    if (!tieneModuloHabilitado && !tienePermisoToken) {
      throw new ForbiddenException(
        'El rol del usuario no tiene habilitado el módulo de Registro de ingresos',
      );
    }

    const esDocente = rolStr.includes('docente');
    const esControl = rolStr.includes('control');
    const esRolPersonalizado = !esDocente && !esControl;

    return {
      esAdmin: false,
      esDocente,
      esControl,
      esRolPersonalizado,
    };
  }

  /**
   * Valida y aplica los alcances de datos estrictamente por rol:
   * - Docente: solo materias que dicta.
   * - Personal de control: solo exámenes en los que fue asignado.
   * - Roles personalizados: solo dentro de su Usuario_Alcance.
   * - Administrador: acceso total.
   */
  private async validarAlcanceFiltros(
    user: AuthenticatedUser,
    filtros: FiltroObservacionesDto,
    rolInfo: RolPermisosInfo,
  ) {
    if (rolInfo.esAdmin) {
      // Acceso irrestricto
      return;
    }

    if (rolInfo.esDocente) {
      // 1. Docente envía docenteId ajeno -> 403
      if (filtros.docenteId && filtros.docenteId !== user.id) {
        throw new ForbiddenException(
          'No puedes consultar observaciones de otros docentes',
        );
      }

      // 2. Si envía examenId, debe ser su examen
      if (filtros.examenId) {
        const exId = Number(filtros.examenId);
        if (Number.isNaN(exId)) {
          throw new NotFoundException('El examen no existe');
        }
        const examen = await this.prisma.examen.findUnique({
          where: { id: exId },
          select: { usuarioId: true },
        });
        if (!examen) {
          throw new NotFoundException('El examen no existe');
        }
        if (examen.usuarioId !== user.id) {
          throw new ForbiddenException(
            'No puedes acceder a observaciones de exámenes que no te pertenecen',
          );
        }
      }

      // 3. Si envía materiaId, debe dictarla (tener al menos un examen de esa materia o estar en su alcance)
      if (filtros.materiaId) {
        const matId = Number(filtros.materiaId);
        const cmCond: Prisma.Examen_Carrera_MateriaWhereInput = !Number.isNaN(
          matId,
        )
          ? { materiaId: matId }
          : {
              carrera_materia: {
                materia: {
                  nombre: {
                    equals: String(filtros.materiaId),
                    mode: 'insensitive',
                  },
                },
              },
            };
        const tieneExamenMateria = await this.prisma.examen.findFirst({
          where: {
            usuarioId: user.id,
            carrerasMaterias: { some: cmCond },
          },
        });
        const tieneAlcanceMateria = !Number.isNaN(matId)
          ? await this.prisma.usuario_Alcance.findFirst({
              where: {
                usuarioId: user.id,
                OR: [
                  { materiaId: matId },
                  {
                    carrera: {
                      materias: { some: { materiaId: matId } },
                    },
                  },
                ],
              },
            })
          : null;
        if (!tieneExamenMateria && !tieneAlcanceMateria) {
          throw new ForbiddenException(
            'La materia no pertenece a las materias que dicta el docente',
          );
        }
      }

      return;
    }

    if (rolInfo.esControl) {
      // Personal de control: no puede filtrar por facultad o carrera (criterio 29)
      if (filtros.facultadId || filtros.carreraId) {
        throw new ForbiddenException(
          'El personal de control no tiene permitido filtrar por facultad o carrera',
        );
      }

      // Si envía examenId, debe haber sido asignado
      if (filtros.examenId) {
        const exId = Number(filtros.examenId);
        if (Number.isNaN(exId)) {
          throw new NotFoundException('El examen no existe');
        }
        const examen = await this.prisma.examen.findUnique({
          where: { id: exId },
          include: { controladores: true },
        });
        if (!examen) {
          throw new NotFoundException('El examen no existe');
        }
        const estaAsignado =
          examen.usuarioId === user.id ||
          examen.controladores.some((c) => c.colaboradorId === user.id);
        if (!estaAsignado) {
          throw new ForbiddenException(
            'No estás asignado como controlador de este examen',
          );
        }
      }

      // Si envía materiaId, debe tener asignaciones en esa materia
      if (filtros.materiaId) {
        const matId = Number(filtros.materiaId);
        const cmCond: Prisma.Examen_Carrera_MateriaWhereInput = !Number.isNaN(
          matId,
        )
          ? { materiaId: matId }
          : {
              carrera_materia: {
                materia: {
                  nombre: {
                    equals: String(filtros.materiaId),
                    mode: 'insensitive',
                  },
                },
              },
            };
        const asignadoMateria = await this.prisma.examen.findFirst({
          where: {
            carrerasMaterias: { some: cmCond },
            controladores: { some: { colaboradorId: user.id } },
          },
        });
        if (!asignadoMateria) {
          throw new ForbiddenException(
            'No tienes asignaciones de control para la materia solicitada',
          );
        }
      }

      // Si envía docenteId, debe tener asignaciones en exámenes de ese docente
      if (filtros.docenteId) {
        const docId = Number(filtros.docenteId);
        if (!Number.isNaN(docId)) {
          const asignadoDocente = await this.prisma.examen.findFirst({
            where: {
              usuarioId: docId,
              controladores: { some: { colaboradorId: user.id } },
            },
          });
          if (!asignadoDocente) {
            throw new ForbiddenException(
              'No tienes asignaciones de control en exámenes del docente solicitado',
            );
          }
        }
      }

      return;
    }

    if (rolInfo.esRolPersonalizado) {
      // Roles nuevos: validar contra Usuario_Alcance
      const alcances = await this.prisma.usuario_Alcance.findMany({
        where: { usuarioId: user.id },
      });

      const facultadIds = alcances
        .filter((a) => a.facultadId !== null)
        .map((a) => a.facultadId as number);
      const carreraIds = alcances
        .filter((a) => a.carreraId !== null)
        .map((a) => a.carreraId as number);
      const materiaIds = alcances
        .filter((a) => a.materiaId !== null)
        .map((a) => a.materiaId as number);

      const facId = Number(filtros.facultadId);
      if (
        filtros.facultadId &&
        !Number.isNaN(facId) &&
        !facultadIds.includes(facId)
      ) {
        throw new ForbiddenException(
          'La facultad queda fuera de su alcance asignado',
        );
      }
      const carId = Number(filtros.carreraId);
      if (
        filtros.carreraId &&
        !Number.isNaN(carId) &&
        !carreraIds.includes(carId)
      ) {
        throw new ForbiddenException(
          'La carrera queda fuera de su alcance asignado',
        );
      }
      const matId = Number(filtros.materiaId);
      if (
        filtros.materiaId &&
        !Number.isNaN(matId) &&
        !materiaIds.includes(matId)
      ) {
        // También verificar si la materia está dentro de sus carreras o facultades
        const materiaEnAlcance = await this.prisma.carrera_Materia.findFirst({
          where: {
            materiaId: matId,
            OR: [
              carreraIds.length > 0
                ? { carreraId: { in: carreraIds } }
                : undefined,
              facultadIds.length > 0
                ? { carrera: { facultadId: { in: facultadIds } } }
                : undefined,
            ].filter(Boolean) as Prisma.Carrera_MateriaWhereInput[],
          },
        });
        if (!materiaEnAlcance) {
          throw new ForbiddenException(
            'La materia queda fuera de su alcance asignado',
          );
        }
      }
      if (filtros.examenId) {
        const exId = Number(filtros.examenId);
        if (Number.isNaN(exId)) {
          throw new NotFoundException('El examen no existe');
        }
        const examen = await this.prisma.examen.findUnique({
          where: { id: exId },
          include: { carrerasMaterias: true },
        });
        if (!examen) {
          throw new NotFoundException('El examen no existe');
        }
        const perteneceAlcance = examen.carrerasMaterias.some(
          (cm) =>
            materiaIds.includes(cm.materiaId) ||
            carreraIds.includes(cm.carreraId),
        );
        if (!perteneceAlcance && materiaIds.length > 0) {
          throw new ForbiddenException(
            'El examen queda fuera de su alcance asignado',
          );
        }
      }
    }
  }

  /**
   * Construye las condiciones Prisma para la consulta de IncidenciaIngreso.
   */
  private construirWhere(
    user: AuthenticatedUser,
    filtros: FiltroObservacionesDto,
    gestionInfo: GestionInfo,
    rolInfo: RolPermisosInfo,
  ): Prisma.IncidenciaIngresoWhereInput {
    const where: Prisma.IncidenciaIngresoWhereInput = {};

    // 1. Condición de examen y gestión (fecha de reservaAmbiente)
    const examenWhere: Prisma.ExamenWhereInput = {
      reservaAmbiente: {
        fecha: {
          gte: gestionInfo.inicio,
          lte: gestionInfo.fin,
        },
      },
    };

    // Filtro por examenId puntual
    if (filtros.examenId) {
      const exId = Number(filtros.examenId);
      if (!Number.isNaN(exId)) {
        where.examenId = exId;
      }
    }

    // Filtro por docenteId
    if (filtros.docenteId) {
      const docId = Number(filtros.docenteId);
      if (!Number.isNaN(docId)) {
        examenWhere.usuarioId = docId;
      }
    }

    // Filtros por materiaId, carreraId o facultadId
    const cmConditions: Prisma.Examen_Carrera_MateriaWhereInput[] = [];
    if (filtros.materiaId) {
      const matId = Number(filtros.materiaId);
      if (!Number.isNaN(matId)) {
        cmConditions.push({ materiaId: matId });
      } else {
        cmConditions.push({
          carrera_materia: {
            materia: {
              nombre: {
                equals: String(filtros.materiaId),
                mode: 'insensitive',
              },
            },
          },
        });
      }
    }
    // Solo administrador aplica facultadId y carreraId para filtrar exámenes
    if (rolInfo.esAdmin) {
      if (filtros.carreraId) {
        const carId = Number(filtros.carreraId);
        if (!Number.isNaN(carId)) {
          cmConditions.push({ carreraId: carId });
        } else {
          cmConditions.push({
            carrera_materia: {
              carrera: {
                nombre: {
                  equals: String(filtros.carreraId),
                  mode: 'insensitive',
                },
              },
            },
          });
        }
      }
      if (filtros.facultadId) {
        const facId = Number(filtros.facultadId);
        if (!Number.isNaN(facId)) {
          cmConditions.push({
            carrera_materia: {
              carrera: { facultadId: facId },
            },
          });
        } else {
          cmConditions.push({
            carrera_materia: {
              carrera: {
                facultad: {
                  nombre: {
                    equals: String(filtros.facultadId),
                    mode: 'insensitive',
                  },
                },
              },
            },
          });
        }
      }
    }

    if (cmConditions.length > 0) {
      examenWhere.carrerasMaterias = {
        some: {
          AND: cmConditions,
        },
      };
    }

    // Restricciones de alcance por rol sobre el examen
    if (rolInfo.esDocente) {
      examenWhere.usuarioId = user.id;
    } else if (rolInfo.esControl) {
      examenWhere.controladores = {
        some: { colaboradorId: user.id },
      };
    } else if (rolInfo.esRolPersonalizado) {
      // Alcance de usuario personalizado
      examenWhere.carrerasMaterias = {
        some: {
          OR: [
            filtros.materiaId ? { materiaId: filtros.materiaId } : undefined,
            {
              carrera_materia: {
                carrera: {
                  alcances: { some: { usuarioId: user.id } },
                },
              },
            },
          ].filter(Boolean) as Prisma.Examen_Carrera_MateriaWhereInput[],
        },
      };
    }

    where.examen = examenWhere;

    // 2. Filtro por motivo de observación
    if (filtros.motivo) {
      if (filtros.motivo === MotivoObservacion.QR_EXAMEN_VENCIDO) {
        where.tipoIncidencia = TipoIncidencia.QR_CADUCADO;
      } else if (filtros.motivo === MotivoObservacion.NO_HABILITADO) {
        where.tipoIncidencia = {
          in: [TipoIncidencia.NO_HABILITADO, TipoIncidencia.NO_ENCONTRADO],
        };
      } else if (filtros.motivo === MotivoObservacion.DOBLE_MARCACION) {
        where.tipoIncidencia = TipoIncidencia.DOBLE_MARCACION;
      } else if (filtros.motivo === MotivoObservacion.QR_NO_VALIDO) {
        where.tipoIncidencia = TipoIncidencia.IDENTIDAD_NO_COINCIDE;
      } else if (filtros.motivo === MotivoObservacion.QR_OTRO_EXAMEN) {
        where.tipoIncidencia = 'QR_OTRO_EXAMEN' as unknown as TipoIncidencia;
      }
    }

    return where;
  }

  private mapearTipoMotivo(tipo: TipoIncidencia): {
    motivo: string;
    motivoEtiqueta: string;
  } {
    switch (tipo) {
      case TipoIncidencia.NO_HABILITADO:
      case TipoIncidencia.NO_ENCONTRADO:
        return {
          motivo: MotivoObservacion.NO_HABILITADO,
          motivoEtiqueta: 'No habilitado',
        };
      case TipoIncidencia.DOBLE_MARCACION:
        return {
          motivo: MotivoObservacion.DOBLE_MARCACION,
          motivoEtiqueta: 'Doble marcación',
        };
      case TipoIncidencia.QR_CADUCADO:
        return {
          motivo: MotivoObservacion.QR_EXAMEN_VENCIDO,
          motivoEtiqueta: 'QR de examen vencido',
        };
      case TipoIncidencia.IDENTIDAD_NO_COINCIDE:
        return {
          motivo: MotivoObservacion.QR_NO_VALIDO,
          motivoEtiqueta: 'QR no válido',
        };
      default:
        return {
          motivo: String(tipo),
          motivoEtiqueta: ETIQUETAS_MOTIVO[tipo] ?? String(tipo),
        };
    }
  }

  /**
   * Endpoint 1: Listado de observaciones de ingreso filtrables por examen, materia, docente, motivo y gestión.
   */
  async listar(user: AuthenticatedUser, filtros: FiltroObservacionesDto) {
    const rolInfo = await this.verificarAccesoModulo(user);
    const gestionInfo = this.validarGestion(filtros.gestion);
    await this.validarAlcanceFiltros(user, filtros, rolInfo);

    const where = this.construirWhere(user, filtros, gestionInfo, rolInfo);

    const registros = await this.prisma.incidenciaIngreso.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      include: {
        estudiante: true,
        controlador: true,
        examen: {
          include: INCLUDE_EXAMEN_COMPLETO,
        },
      },
    });

    const items = registros.map((r) => {
      const est = r.estudiante;
      const ctrl = r.controlador;
      const examen = r.examen as ExamenCompleto | undefined;

      const pares =
        examen?.carrerasMaterias?.map((cm) => cm.carrera_materia) ?? [];
      const materiaNombre =
        pares.map((p) => p.materia.nombre).join(' / ') || 'Materia';
      const carreraNombre =
        pares.map((p) => p.carrera.nombre).join(' / ') || 'Carrera';
      const facultadNombre =
        pares[0]?.carrera?.facultad?.nombre ||
        examen?.reservaAmbiente?.ambiente?.facultad?.nombre ||
        'Facultad de Ciencias y Tecnología';

      const { motivo, motivoEtiqueta } = this.mapearTipoMotivo(
        r.tipoIncidencia,
      );

      return {
        id: r.id,
        hora: formatearHoraBolivia(r.fechaHora),
        codigoSis: est?.cod_sis ?? r.codSisIngresado ?? '—',
        estudiante: est
          ? [est.nombre, est.apellido].filter(Boolean).join(' ')
          : (r.nombreReferencial ?? 'No registrado'),
        motivo,
        motivoEtiqueta,
        registradoPor: ctrl
          ? [ctrl.nombre, ctrl.apellido].filter(Boolean).join(' ')
          : 'Controlador no identificado',
        fechaHora: r.fechaHora.toISOString(),
        examenId: r.examenId,
        materia: materiaNombre,
        carrera: carreraNombre,
        facultad: facultadNombre,
      };
    });

    // Paginación si se especifica
    const page = filtros.page ?? 1;
    const limit = filtros.limit;
    const itemsPaginados =
      limit && limit > 0
        ? items.slice((page - 1) * limit, page * limit)
        : items;

    return {
      total: items.length,
      items: itemsPaginados,
    };
  }

  /**
   * Endpoint 2: Descarga en PDF del reporte de observaciones institucional (HU18).
   * Genera el PDF con observaciones agrupadas por examen y ordenadas por facultad, carrera, materia y fecha.
   * Si no existen observaciones, responde 400 sin generar un PDF vacío.
   */
  async generarReportePdf(
    user: AuthenticatedUser,
    filtros: FiltroObservacionesDto,
    ip?: string,
  ) {
    const rolInfo = await this.verificarAccesoModulo(user);
    const gestionInfo = this.validarGestion(filtros.gestion);
    await this.validarAlcanceFiltros(user, filtros, rolInfo);

    const where = this.construirWhere(user, filtros, gestionInfo, rolInfo);

    const registros = await this.prisma.incidenciaIngreso.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      include: {
        estudiante: true,
        controlador: true,
        examen: {
          include: INCLUDE_EXAMEN_COMPLETO,
        },
      },
    });

    if (registros.length === 0) {
      throw new BadRequestException(
        'No hay observaciones de ingreso que coincidan con los filtros seleccionados.',
      );
    }

    // Agrupar observaciones por examen
    const gruposMap = new Map<number, ExamenPdfGrupo>();

    for (const r of registros) {
      const examen = r.examen;
      const exId = examen.id;

      if (!gruposMap.has(exId)) {
        const pares =
          examen.carrerasMaterias?.map((cm) => cm.carrera_materia) ?? [];
        const materiaNombre =
          Array.from(new Set(pares.map((p) => p.materia.nombre))).join(' / ') ||
          'Materia';
        const carreraNombre =
          Array.from(new Set(pares.map((p) => p.carrera.nombre))).join(' / ') ||
          'Carrera';
        const facultadNombre =
          pares[0]?.carrera?.facultad?.nombre ||
          examen.reservaAmbiente?.ambiente?.facultad?.nombre ||
          'Facultad de Ciencias y Tecnología';

        const resAmb = examen.reservaAmbiente;
        const horFijo = resAmb?.horarioFijo;
        const horaIni = horFijo?.horaIni
          ? horFijo.horaIni.toISOString().substring(11, 16)
          : '08:00';
        const horaFin = horFijo?.horaFin
          ? horFijo.horaFin.toISOString().substring(11, 16)
          : '09:30';

        const fechaExamenStr = resAmb?.fecha
          ? formatearFechaBolivia(resAmb.fecha)
          : new Date().toISOString().slice(0, 10);

        const resp = examen.responsable;
        const nombreDocente = resp
          ? [resp.nombre, resp.apellido].filter(Boolean).join(' ')
          : 'Docente responsable';

        gruposMap.set(exId, {
          materia: materiaNombre,
          examen: examen.tipoExamen,
          carrera: carreraNombre,
          facultad: facultadNombre,
          docente: nombreDocente,
          ambiente: resAmb?.ambiente?.nombre ?? 'Ambiente no asignado',
          fechaExamen: fechaExamenStr,
          horario: `${horaIni} - ${horaFin}`,
          totalExamen: 0,
          filas: [],
        });
      }

      const grupo = gruposMap.get(exId)!;
      const est = r.estudiante;
      const ctrl = r.controlador;
      const { motivoEtiqueta } = this.mapearTipoMotivo(r.tipoIncidencia);

      grupo.filas.push({
        hora: formatearHoraBolivia(r.fechaHora),
        codigoSis: est?.cod_sis ?? r.codSisIngresado ?? '—',
        estudiante: est
          ? [est.nombre, est.apellido].filter(Boolean).join(' ')
          : (r.nombreReferencial ?? 'No registrado'),
        motivo: motivoEtiqueta,
        registradoPor: ctrl
          ? [ctrl.nombre, ctrl.apellido].filter(Boolean).join(' ')
          : 'Controlador no identificado',
      });
      grupo.totalExamen = grupo.filas.length;
    }

    // Ordenar los grupos por facultad, carrera, materia y fecha
    const gruposOrdenados = Array.from(gruposMap.values()).sort((a, b) => {
      const cmpFac = a.facultad.localeCompare(b.facultad);
      if (cmpFac !== 0) return cmpFac;
      const cmpCar = a.carrera.localeCompare(b.carrera);
      if (cmpCar !== 0) return cmpCar;
      const cmpMat = a.materia.localeCompare(b.materia);
      if (cmpMat !== 0) return cmpMat;
      return a.fechaExamen.localeCompare(b.fechaExamen);
    });

    // Obtener nombre del usuario que genera el reporte
    const usuarioDb = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: { nombre: true, apellido: true },
    });
    const nombreGenerador = usuarioDb
      ? [usuarioDb.nombre, usuarioDb.apellido].filter(Boolean).join(' ')
      : user.nombre;

    const ahora = new Date();
    const generadoEnStr = formatearFechaHoraServidor(ahora);

    // Etiquetas de filtros aplicados
    const etiquetaMotivo = filtros.motivo
      ? (ETIQUETAS_MOTIVO[filtros.motivo] ?? filtros.motivo)
      : 'Todos los motivos';

    let facultadFiltroTexto = 'Todas';
    if (filtros.facultadId) {
      const facId = Number(filtros.facultadId);
      if (!Number.isNaN(facId)) {
        const fac = await this.prisma.facultad.findUnique({
          where: { id: facId },
          select: { nombre: true },
        });
        if (fac) facultadFiltroTexto = fac.nombre;
      } else {
        facultadFiltroTexto = String(filtros.facultadId);
      }
    }

    let carreraFiltroTexto = 'Todas';
    if (filtros.carreraId) {
      const carId = Number(filtros.carreraId);
      if (!Number.isNaN(carId)) {
        const car = await this.prisma.carrera.findUnique({
          where: { id: carId },
          select: { nombre: true },
        });
        if (car) carreraFiltroTexto = car.nombre;
      } else {
        carreraFiltroTexto = String(filtros.carreraId);
      }
    }

    let docenteFiltroTexto = 'Todos';
    if (filtros.docenteId) {
      const docId = Number(filtros.docenteId);
      if (!Number.isNaN(docId)) {
        const doc = await this.prisma.usuario.findUnique({
          where: { id: docId },
          select: { nombre: true, apellido: true },
        });
        if (doc) {
          docenteFiltroTexto = [doc.nombre, doc.apellido]
            .filter(Boolean)
            .join(' ');
        }
      } else {
        docenteFiltroTexto = String(filtros.docenteId);
      }
    } else if (rolInfo.esDocente) {
      docenteFiltroTexto = nombreGenerador;
    }

    let materiaFiltroTexto = 'Todas';
    if (filtros.materiaId) {
      const matId = Number(filtros.materiaId);
      if (!Number.isNaN(matId)) {
        const mat = await this.prisma.materia.findUnique({
          where: { id: matId },
          select: { nombre: true },
        });
        if (mat) materiaFiltroTexto = mat.nombre;
      } else {
        materiaFiltroTexto = String(filtros.materiaId);
      }
    } else if (gruposOrdenados.length === 1) {
      materiaFiltroTexto = gruposOrdenados[0].materia;
    }

    const pdfData: ObservacionesPdfData = {
      facultadFiltro: facultadFiltroTexto,
      carreraFiltro: carreraFiltroTexto,
      docenteFiltro: docenteFiltroTexto,
      materiaFiltro: materiaFiltroTexto,
      gestionFiltro: gestionInfo.gestion,
      examenFiltro:
        gruposOrdenados.length === 1 ? gruposOrdenados[0].examen : 'Todos',
      motivoFiltro: etiquetaMotivo,
      total: registros.length,
      grupos: gruposOrdenados,
      generadoPor: nombreGenerador,
      generadoEn: generadoEnStr,
    };

    const buffer = await this.pdfService.generar(pdfData);

    // Auditoría HU21: Registrar cada descarga de PDF
    const examenIdNum = filtros.examenId ? Number(filtros.examenId) : undefined;
    const registroIdVal =
      !Number.isNaN(examenIdNum) && examenIdNum
        ? examenIdNum
        : (registros[0]?.examenId ?? null);

    await this.prisma.bitacora_Auditoria.create({
      data: {
        usuarioId: user.id,
        accion: 'DESCARGA_REPORTE_OBSERVACIONES_INGRESO',
        modulo: 'Registro de ingresos',
        tablaAfectada: 'incidencia_ingreso',
        registroId: registroIdVal,
        detallesNuevo: {
          usuarioId: user.id,
          rol: user.rol,
          filtros: {
            gestion: gestionInfo.gestion,
            facultadId: filtros.facultadId ?? null,
            carreraId: filtros.carreraId ?? null,
            docenteId: filtros.docenteId ?? null,
            materiaId: filtros.materiaId ?? null,
            examenId: filtros.examenId ?? null,
            motivo: filtros.motivo ?? 'TODOS',
          },
          totalObservaciones: registros.length,
          fechaGeneracion: generadoEnStr,
        },
        ipOrigen: ip?.substring(0, 45) ?? null,
      },
    });

    // Criterio 32: Nombre del archivo identifica materia (o TodasLasMaterias), gestión, fecha y facultad si se filtró
    const facultadPrefijo = filtros.facultadId
      ? `${limpiarCadena(facultadFiltroTexto)}_`
      : '';
    const materiaStr =
      materiaFiltroTexto && materiaFiltroTexto !== 'Todas'
        ? limpiarCadena(materiaFiltroTexto)
        : 'TodasLasMaterias';
    const gestionStr = gestionInfo.gestion
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace('/', '-');
    const fechaGeneracion = formatearFechaBolivia(ahora);

    const filename = `observaciones_${facultadPrefijo}${materiaStr}_${gestionStr}_${fechaGeneracion}.pdf`;

    return { buffer, filename };
  }
}
