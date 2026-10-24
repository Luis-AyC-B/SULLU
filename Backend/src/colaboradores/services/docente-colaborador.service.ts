/* eslint-disable */
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitarColaboradorDto } from '../dto/solicitar-colaborador.dto';

const ROL_PERSONAL_CONTROL = 3; // Personal de control
const ROL_ESTUDIANTE = 5;       // Estudiante

@Injectable()
export class DocenteColaboradorService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // AUTOCOMPLETADO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * HU13: Búsqueda predictiva de estudiantes por código SIS (parcial o completo).
   * Solo retorna estudiantes que ya tienen cuenta de usuario (usuarioId != null).
   */
  async buscarEstudiantesPorCodSis(codSisQuery: string) {
    const q = codSisQuery.trim();
    if (!q) return [];

    const estudiantes = await this.prisma.estudiante.findMany({
      where: {
        cod_sis: { contains: q },
        usuarioId: { not: null }, // solo los que ya tienen cuenta (HU6)
      },
      select: {
        id: true,
        cod_sis: true,
        nombre: true,
        apellido: true,
        usuario: { select: { id: true, correo: true } },
      },
      take: 10,
      orderBy: { cod_sis: 'asc' },
    });

    return estudiantes.map((e) => ({
      id: e.id,
      codSis: e.cod_sis,
      nombre: e.nombre,
      apellido: e.apellido ?? '',
      email: e.usuario?.correo ?? '',
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOLICITUD (DOCENTE)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * HU13: Registra una nueva solicitud de colaborador para el docente autenticado.
   * Recibe solo el código SIS del estudiante ya registrado en el sistema.
   * NO asigna ningún rol — el estudiante sigue siendo solo Estudiante hasta que el admin apruebe.
   */
  async solicitarColaborador(docenteId: number, dto: SolicitarColaboradorDto) {
    const codSis = dto.codSis.trim();

    // 1. Buscar el estudiante en el sistema por cod_sis
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { cod_sis: codSis },
      include: { usuario: true },
    });

    if (!estudiante) {
      throw new NotFoundException(
        'El código SIS no corresponde a un estudiante registrado.',
      );
    }

    // 2. El estudiante debe tener cuenta de usuario (creada por HU6)
    if (!estudiante.usuarioId || !estudiante.usuario) {
      throw new BadRequestException(
        'Este estudiante aún no tiene cuenta de usuario en el sistema.',
      );
    }

    const colaboradorUsuarioId = estudiante.usuarioId;

    // 3. Auto-invitación: el docente no puede solicitarse a sí mismo
    if (colaboradorUsuarioId === docenteId) {
      throw new BadRequestException(
        'No puedes agregarte a ti mismo como colaborador.',
      );
    }

    // 4. Verificar que no esté ya APROBADO en la nómina del docente
    const solicitudAprobada = await this.prisma.docenteColaborador.findFirst({
      where: {
        docenteId,
        colaboradorId: colaboradorUsuarioId,
        estadoSolicitud: EstadoSolicitud.APROBADO,
      },
    });

    if (solicitudAprobada) {
      throw new ConflictException(
        'Este colaborador ya forma parte de tu equipo activo.',
      );
    }

    // 5. Verificar que no haya una solicitud PENDIENTE duplicada
    const solicitudPendiente = await this.prisma.docenteColaborador.findFirst({
      where: {
        docenteId,
        colaboradorId: colaboradorUsuarioId,
        estadoSolicitud: EstadoSolicitud.PENDIENTE,
      },
    });

    if (solicitudPendiente) {
      throw new ConflictException(
        'Ya existe una solicitud pendiente para este colaborador.',
      );
    }

    // 6. Crear la solicitud en PENDIENTE — colaboradorId YA se conoce desde el inicio
    const nueva = await this.prisma.docenteColaborador.create({
      data: {
        docenteId,
        colaboradorId: colaboradorUsuarioId,
        estadoSolicitud: EstadoSolicitud.PENDIENTE,
      },
      include: {
        colaborador: {
          include: { estudiante: { select: { cod_sis: true } } },
        },
      },
    });

    return this.mapearNominaItem(nueva, docenteId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APROBACIÓN / RECHAZO (ADMINISTRADOR)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * HU13: Aprueba una solicitud de colaborador (solo Administrador).
   * Agrega el rol "Personal de control" al estudiante SIN quitar su rol Estudiante
   * (multi-rol: el usuario tendrá Estudiante + Personal de control simultáneamente).
   */
  async aprobarSolicitud(solicitudId: number, adminId: number) {
    const solicitud = await this.prisma.docenteColaborador.findUnique({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException('La solicitud ya fue procesada anteriormente.');
    }

    if (!solicitud.colaboradorId) {
      throw new BadRequestException(
        'La solicitud no tiene un colaborador vinculado.',
      );
    }

    const colaboradorUsuarioId = solicitud.colaboradorId;

    // Transacción: agregar rol + actualizar solicitud
    const [, solicitudActualizada] = await this.prisma.$transaction([
      // Agrega rol "Personal de control" sin quitar rol "Estudiante"
      this.prisma.usuario_Rol.upsert({
        where: {
          usuarioId_rolId: {
            usuarioId: colaboradorUsuarioId,
            rolId: ROL_PERSONAL_CONTROL,
          },
        },
        create: {
          usuarioId: colaboradorUsuarioId,
          rolId: ROL_PERSONAL_CONTROL,
        },
        update: {}, // ya existe, no hacer nada
      }),
      // Actualizar estado de la solicitud
      this.prisma.docenteColaborador.update({
        where: { id: solicitudId },
        data: {
          estadoSolicitud: EstadoSolicitud.APROBADO,
          aprobadoPor: adminId,
          fechaRespuesta: new Date(),
        },
        include: {
          docente: { select: { id: true, nombre: true, apellido: true, correo: true } },
          colaborador: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              correo: true,
              estudiante: { select: { cod_sis: true } },
            },
          },
        },
      }),
    ]);

    return this.mapearSolicitudAdmin(solicitudActualizada);
  }

  /**
   * HU13: Rechaza una solicitud pendiente (solo Administrador).
   * NO toca Usuario_Rol — el estudiante conserva únicamente su rol Estudiante.
   */
  async rechazarSolicitud(solicitudId: number, adminId: number) {
    const solicitud = await this.prisma.docenteColaborador.findUnique({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException('La solicitud ya fue procesada anteriormente.');
    }

    const actualizada = await this.prisma.docenteColaborador.update({
      where: { id: solicitudId },
      data: {
        estadoSolicitud: EstadoSolicitud.RECHAZADO,
        aprobadoPor: adminId,
        fechaRespuesta: new Date(),
      },
      include: {
        docente: { select: { id: true, nombre: true, apellido: true, correo: true } },
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
            estudiante: { select: { cod_sis: true } },
          },
        },
      },
    });

    return this.mapearSolicitudAdmin(actualizada);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BAJA (DOCENTE)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * HU13: Marca un colaborador de la nómina como INACTIVO (Docente).
   */
  async darDeBajaColaborador(docenteId: number, relacionId: number) {
    const relacion = await this.prisma.docenteColaborador.findUnique({
      where: { id: relacionId },
    });

    if (!relacion) {
      throw new NotFoundException('Colaborador no encontrado en tu nómina.');
    }

    if (relacion.docenteId !== docenteId) {
      throw new ForbiddenException('No tienes autorización sobre este colaborador.');
    }

    if (relacion.estadoSolicitud !== EstadoSolicitud.APROBADO) {
      throw new BadRequestException(
        'Solo se puede dar de baja a un colaborador aprobado.',
      );
    }

    const actualizada = await this.prisma.docenteColaborador.update({
      where: { id: relacionId },
      data: { estadoSolicitud: EstadoSolicitud.INACTIVO },
      include: {
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
            estudiante: { select: { cod_sis: true } },
          },
        },
      },
    });

    return this.mapearNominaItem(actualizada, docenteId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LISTADOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * HU13: Obtiene la nómina de colaboradores del docente autenticado.
   */
  async getNominaDocente(docenteId: number) {
    const relaciones = await this.prisma.docenteColaborador.findMany({
      where: { docenteId },
      include: {
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
            estudiante: { select: { cod_sis: true } },
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    return Promise.all(
      relaciones.map(async (rel) => {
        let examenesAsignadosIds: number[] = [];

        if (rel.colaboradorId) {
          const asignaciones = await this.prisma.examenControlador.findMany({
            where: { colaboradorId: rel.colaboradorId, asignadoPor: docenteId },
            select: { examenId: true },
          });
          examenesAsignadosIds = asignaciones.map((a) => a.examenId);
        }

        return {
          ...this.mapearNominaItem(rel, docenteId),
          examenesAsignadosIds,
          examenesAsignadosCount: examenesAsignadosIds.length,
        };
      }),
    );
  }

  /**
   * HU13: Obtiene solo las solicitudes PENDIENTES para el panel del Administrador.
   */
  async getSolicitudesPendientesAdmin() {
    const solicitudes = await this.prisma.docenteColaborador.findMany({
      where: { estadoSolicitud: EstadoSolicitud.PENDIENTE },
      include: {
        docente: { select: { id: true, nombre: true, apellido: true, correo: true } },
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
            estudiante: { select: { cod_sis: true } },
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    return solicitudes.map((sol) => this.mapearSolicitudAdmin(sol));
  }

  /**
   * HU13: Obtiene TODOS los registros de colaboradores (todos los estados) para el admin.
   */
  async getTodosAdmin() {
    const registros = await this.prisma.docenteColaborador.findMany({
      include: {
        docente: { select: { id: true, nombre: true, apellido: true, correo: true } },
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
            estudiante: { select: { cod_sis: true } },
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    return registros.map((sol) => this.mapearSolicitudAdmin(sol));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAPEO PRIVADO
  // ─────────────────────────────────────────────────────────────────────────

  /** Mapea un registro para la vista de nómina del docente. */
  private mapearNominaItem(rel: any, docenteId: number) {
    const nombre: string = rel.colaborador?.nombre ?? '';
    const apellido: string = rel.colaborador?.apellido ?? '';
    const codSis: string = rel.colaborador?.estudiante?.cod_sis ?? '';
    const email: string = rel.colaborador?.correo ?? '';

    return {
      id: rel.id,
      colaboradorId: rel.colaboradorId,
      codSis,
      nombre,
      apellido,
      nombres: nombre,
      apellidos: apellido,
      nombreCompleto: `${nombre} ${apellido}`.trim(),
      email,
      estado: rel.estadoSolicitud,
      fechaSolicitud: this.formatearFecha(rel.fechaSolicitud),
      fechaRespuesta: rel.fechaRespuesta ? this.formatearFecha(rel.fechaRespuesta) : '—',
      usuarioExiste: Boolean(rel.colaboradorId),
      rol: rel.estadoSolicitud === EstadoSolicitud.APROBADO ? 'Personal de control' : undefined,
    };
  }

  /** Mapea un registro para la vista de administrador. */
  private mapearSolicitudAdmin(sol: any) {
    const nombre: string = sol.colaborador?.nombre ?? '';
    const apellido: string = sol.colaborador?.apellido ?? '';
    const codSis: string = sol.colaborador?.estudiante?.cod_sis ?? '';
    const email: string = sol.colaborador?.correo ?? '';
    const docenteNombre = sol.docente
      ? `${sol.docente.nombre} ${sol.docente.apellido ?? ''}`.trim()
      : 'Docente';

    return {
      id: sol.id,
      colaboradorId: sol.colaboradorId,
      codSis,
      nombre,
      apellido,
      nombres: nombre,
      apellidos: apellido,
      nombreCompleto: `${nombre} ${apellido}`.trim(),
      email,
      estado: sol.estadoSolicitud,
      fechaSolicitud: this.formatearFecha(sol.fechaSolicitud),
      fechaRespuesta: sol.fechaRespuesta ? this.formatearFecha(sol.fechaRespuesta) : '—',
      docenteId: sol.docenteId,
      docenteNombre,
      docenteEmail: sol.docente?.correo ?? '',
      usuarioExiste: Boolean(sol.colaboradorId),
      rol: sol.estadoSolicitud === EstadoSolicitud.APROBADO ? 'Personal de control' : undefined,
      examenesAsignadosIds: [],
      examenesAsignadosCount: 0,
    };
  }

  private formatearFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '—';
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = meses[dateObj.getMonth()];
    const y = dateObj.getFullYear();
    return `${d} ${m} ${y}`;
  }
}
