/* eslint-disable */
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitarColaboradorDto } from '../dto/solicitar-colaborador.dto';

const ROL_PERSONAL_CONTROL = 'Personal de control';

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

  /** Confirma un colaborador y le asigna el rol de control en la misma transacción. */
  async solicitarColaborador(docenteId: number, dto: SolicitarColaboradorDto) {
    const codSis = dto.codSis.trim();

    const nueva = await this.prisma.$transaction(async (tx) => {
      // Serializa confirmaciones simultáneas para el mismo estudiante.
      const [estudiante] = await tx.$queryRaw<
        { usuarioId: number | null }[]
      >`
        SELECT u.id AS "usuarioId"
        FROM estudiantes e
        LEFT JOIN usuarios u ON u.id = e.usuario_id AND u.deleted_at IS NULL
        WHERE e.cod_sis = ${codSis}
        FOR UPDATE OF e
      `;

      if (!estudiante) {
        throw new NotFoundException(
          'El código SIS no corresponde a un estudiante registrado.',
        );
      }

      const colaboradorId = estudiante.usuarioId;
      if (colaboradorId === null) {
        throw new BadRequestException(
          'Este estudiante aún no tiene cuenta de usuario en el sistema.',
        );
      }

      if (colaboradorId === docenteId) {
        throw new BadRequestException(
          'No puedes agregarte a ti mismo como colaborador.',
        );
      }

      const relaciones = await tx.docenteColaborador.findMany({
        where: {
          docenteId,
          colaboradorId,
          estadoSolicitud: { in: [EstadoSolicitud.APROBADO, EstadoSolicitud.PENDIENTE] },
        },
        select: { id: true, estadoSolicitud: true },
        orderBy: { id: 'desc' },
      });
      if (relaciones.some((rel) => rel.estadoSolicitud === EstadoSolicitud.APROBADO)) {
        throw new ConflictException(
          'Este colaborador ya forma parte de tu equipo activo.',
        );
      }

      const rol = await tx.rol.findUnique({
        where: { nombre: ROL_PERSONAL_CONTROL, deletedAt: null },
        select: { id: true },
      });
      if (!rol) {
        throw new InternalServerErrorException('El rol Personal de control no está configurado.');
      }

      await tx.usuario_Rol.createMany({
        data: { usuarioId: colaboradorId, rolId: rol.id },
        skipDuplicates: true,
      });

      const include = {
        colaborador: {
          include: { estudiante: { select: { cod_sis: true } } },
        },
      } as const;
      const pendiente = relaciones[0];
      if (pendiente) {
        return tx.docenteColaborador.update({
          where: { id: pendiente.id },
          data: { estadoSolicitud: EstadoSolicitud.APROBADO, fechaSolicitud: new Date() },
          include,
        });
      }

      return tx.docenteColaborador.create({
        data: { docenteId, colaboradorId, estadoSolicitud: EstadoSolicitud.APROBADO },
        include,
      });
    });

    return this.mapearNominaItem(nueva, docenteId);
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

    if (relacion.colaboradorId) {
      const examenesAsignados = await this.prisma.examenControlador.count({
        where: {
          colaboradorId: relacion.colaboradorId,
          deletedAt: null,
          OR: [
            { asignadoPor: docenteId },
            { examen: { usuarioId: docenteId } },
          ],
        },
      });

      if (examenesAsignados > 0) {
        throw new BadRequestException(
          'No se puede dar de baja a un colaborador que tiene exámenes asignados. Primero debes retirarlo de sus exámenes.',
        );
      }
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
            where: {
              colaboradorId: rel.colaboradorId,
              deletedAt: null,
              OR: [
                { asignadoPor: docenteId },
                { examen: { usuarioId: docenteId } },
              ],
            },
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
