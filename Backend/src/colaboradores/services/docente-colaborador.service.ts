/* eslint-disable */
import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { SolicitarColaboradorDto } from '../dto/solicitar-colaborador.dto';

@Injectable()
export class DocenteColaboradorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * HU13: Registra una nueva solicitud de colaborador para el docente autenticado.
   */
  async solicitarColaborador(
    docenteId: number,
    data:
      | SolicitarColaboradorDto
      | { email?: string; correo?: string; nombres: string; apellidos: string },
  ) {
    const rawEmail = (data as SolicitarColaboradorDto).getEmail
      ? (data as SolicitarColaboradorDto).getEmail()
      : (data.email || data.correo || '').trim().toLowerCase();

    if (!rawEmail) {
      throw new BadRequestException('El correo institucional es obligatorio.');
    }

    // 1. Auto-invitación: El docente no puede solicitarse a sí mismo
    const docente = await this.prisma.usuario.findUnique({
      where: { id: docenteId },
    });

    if (
      docente &&
      docente.correo &&
      docente.correo.trim().toLowerCase() === rawEmail
    ) {
      throw new BadRequestException(
        'No puedes agregarte a ti mismo como colaborador.',
      );
    }

    // 2. Verificar duplicidad en la nómina del docente
    const solicitudExistente = await this.prisma.docenteColaborador.findFirst({
      where: {
        docenteId,
        OR: [
          { correoSolicitado: rawEmail },
          { colaborador: { correo: rawEmail } },
        ],
      },
      include: { colaborador: true },
    });

    if (solicitudExistente) {
      if (solicitudExistente.estadoSolicitud === EstadoSolicitud.APROBADO) {
        throw new ConflictException(
          'Este colaborador ya forma parte de tu equipo activo.',
        );
      }
      if (solicitudExistente.estadoSolicitud === EstadoSolicitud.PENDIENTE) {
        throw new ConflictException(
          'Ya existe una solicitud pendiente para este colaborador.',
        );
      }
    }

    // 3. Verificar si el usuario ya existe en el sistema
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { correo: rawEmail },
    });

    // 4. Crear registro en DocenteColaborador en estado PENDIENTE sin crear usuario nuevo
    return this.prisma.docenteColaborador.create({
      data: {
        docenteId,
        colaboradorId: usuarioExistente ? usuarioExistente.id : undefined,
        correoSolicitado: rawEmail,
        nombresSolicitados: (data.nombres || '').trim(),
        apellidosSolicitados: (data.apellidos || '').trim(),
        estadoSolicitud: EstadoSolicitud.PENDIENTE,
      },
    });
  }

  /**
   * HU13: Aprueba una solicitud de colaborador (solo Administrador).
   * Si el usuario no existe, crea la cuenta con rol 'Personal de control' y despacha credenciales.
   * Si ya existe, vincula formalmente sin duplicar usuarios.
   */
  async aprobarSolicitud(solicitudId: number, adminId: number) {
    const solicitud = await this.prisma.docenteColaborador.findUnique({
      where: { id: solicitudId },
      include: { colaborador: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        'La solicitud ya fue procesada anteriormente.',
      );
    }

    // Caso A: Usuario preexistente en el sistema
    if (solicitud.colaboradorId) {
      return this.prisma.docenteColaborador.update({
        where: { id: solicitudId },
        data: {
          estadoSolicitud: EstadoSolicitud.APROBADO,
          aprobadoPor: adminId,
          fechaRespuesta: new Date(),
        },
      });
    }

    // Caso B: Usuario nuevo sin cuenta registrada
    const rolControl = await this.prisma.rol.findFirst({
      where: { nombre: 'Personal de control' },
    });
    const rolId = rolControl?.id ?? 3;

    const passwordTemporal =
      'Control' + Math.floor(100000 + Math.random() * 900000) + '!';
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    const emailDestino = (solicitud.correoSolicitado || '')
      .trim()
      .toLowerCase();
    const nombres: string = String(
      (solicitud as any).nombresSolicitados || 'Colaborador',
    );
    const apellidos: string = String(
      (solicitud as any).apellidosSolicitados || '',
    );

    const nuevoUsuario = await this.prisma.usuario.create({
      data: {
        nombre: nombres,
        apellido: apellidos,
        correo: emailDestino,
        password: passwordHash,
        roles: {
          create: [{ rolId }],
        },
      },
    });

    const solicitudActualizada = await this.prisma.docenteColaborador.update({
      where: { id: solicitudId },
      data: {
        colaboradorId: nuevoUsuario.id,
        estadoSolicitud: EstadoSolicitud.APROBADO,
        aprobadoPor: adminId,
        fechaRespuesta: new Date(),
      },
    });

    // Enviar credenciales temporales por correo
    try {
      await this.mailService.enviarCredenciales(
        emailDestino,
        passwordTemporal,
        nombres,
      );
    } catch {
      // No bloquea la transacción si falla SMTP en entorno local
    }

    return solicitudActualizada;
  }

  /**
   * HU13: Rechaza una solicitud pendiente (solo Administrador).
   */
  async rechazarSolicitud(solicitudId: number, adminId: number) {
    const solicitud = await this.prisma.docenteColaborador.findUnique({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        'La solicitud ya fue procesada anteriormente.',
      );
    }

    return this.prisma.docenteColaborador.update({
      where: { id: solicitudId },
      data: {
        estadoSolicitud: EstadoSolicitud.RECHAZADO,
        aprobadoPor: adminId,
        fechaRespuesta: new Date(),
      },
    });
  }

  /**
   * HU13: Marca un colaborador de la nómina como INACTIVO (Docente).
   */
  async darDeBajaColaborador(docenteId: number, relacionId: number) {
    let relacion = await this.prisma.docenteColaborador.findUnique({
      where: { id: relacionId },
    });

    if (!relacion && this.prisma.docenteColaborador?.findFirst) {
      relacion = await this.prisma.docenteColaborador.findFirst({
        where: { docenteId, colaboradorId: relacionId },
      });
    }

    if (!relacion) {
      throw new NotFoundException('Colaborador no encontrado en tu nómina.');
    }

    if (relacion.docenteId !== docenteId) {
      throw new ForbiddenException(
        'No tienes autorización sobre este colaborador.',
      );
    }

    if (relacion.estadoSolicitud === EstadoSolicitud.INACTIVO) {
      throw new BadRequestException('El colaborador ya se encuentra inactivo.');
    }

    return this.prisma.docenteColaborador.update({
      where: { id: relacion.id },
      data: {
        estadoSolicitud: EstadoSolicitud.INACTIVO,
      },
    });
  }

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
            roles: { include: { rol: true } },
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    // Mapear con conteo de exámenes asignados
    return Promise.all(
      relaciones.map(async (rel) => {
        let examenesAsignadosCount = 0;
        let examenesAsignadosIds: number[] = [];

        if (rel.colaboradorId) {
          const asignaciones = await this.prisma.examenControlador.findMany({
            where: {
              colaboradorId: rel.colaboradorId,
              asignadoPor: docenteId,
            },
            select: { examenId: true },
          });
          examenesAsignadosCount = asignaciones.length;
          examenesAsignadosIds = asignaciones.map((a) => a.examenId);
        }

        const nombres: string = String(
          rel.colaborador?.nombre || (rel as any).nombresSolicitados || '',
        );
        const apellidos: string = String(
          rel.colaborador?.apellido || (rel as any).apellidosSolicitados || '',
        );
        const email: string = String(
          rel.colaborador?.correo || rel.correoSolicitado || '',
        );

        return {
          id: rel.id,
          colaboradorId: rel.colaboradorId,
          nombres,
          apellidos,
          nombreCompleto: `${nombres} ${apellidos}`.trim(),
          email,
          estado: rel.estadoSolicitud,
          fechaSolicitud: this.formatearFecha(rel.fechaSolicitud),
          fechaRespuesta: rel.fechaRespuesta
            ? this.formatearFecha(rel.fechaRespuesta)
            : '—',
          examenesAsignadosCount,
          examenesAsignadosIds,
          usuarioExiste: Boolean(rel.colaboradorId),
          rol: 'Personal de control',
        };
      }),
    );
  }

  /**
   * HU13: Obtiene las solicitudes pendientes para el panel de Administrador.
   */
  async getSolicitudesPendientesAdmin() {
    const solicitudes = await this.prisma.docenteColaborador.findMany({
      where: { estadoSolicitud: EstadoSolicitud.PENDIENTE },
      include: {
        docente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    return solicitudes.map((sol) => this.mapearSolicitudAdmin(sol));
  }

  /**
   * HU13: Obtiene TODOS los registros de colaboradores (todos los estados) para el admin.
   * Usado en la pestaña "Todos" del panel de administración.
   */
  async getTodosAdmin() {
    const registros = await this.prisma.docenteColaborador.findMany({
      include: {
        docente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            correo: true,
          },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    return registros.map((sol) => this.mapearSolicitudAdmin(sol));
  }

  /**
   * Mapea un registro de DocenteColaborador al formato de respuesta del admin.
   */
  private mapearSolicitudAdmin(sol: any) {
    const nombres: string = String(
      sol.colaborador?.nombre || sol.nombresSolicitados || '',
    );
    const apellidos: string = String(
      sol.colaborador?.apellido || sol.apellidosSolicitados || '',
    );
    const email: string = String(
      sol.colaborador?.correo || sol.correoSolicitado || '',
    );
    const docenteNombre = sol.docente
      ? `${sol.docente.nombre} ${sol.docente.apellido || ''}`.trim()
      : 'Docente';

    return {
      id: sol.id,
      colaboradorId: sol.colaboradorId,
      nombres,
      apellidos,
      nombreCompleto: `${nombres} ${apellidos}`.trim(),
      email,
      estado: sol.estadoSolicitud,
      fechaSolicitud: this.formatearFecha(sol.fechaSolicitud),
      fechaRespuesta: sol.fechaRespuesta
        ? this.formatearFecha(sol.fechaRespuesta)
        : '—',
      docenteId: sol.docenteId,
      docenteNombre,
      docenteEmail: sol.docente?.correo || '',
      usuarioExiste: Boolean(sol.colaboradorId),
      rol: 'Personal de control',
      examenesAsignadosIds: [],
      examenesAsignadosCount: 0,
    };
  }

  private formatearFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '—';
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
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = meses[dateObj.getMonth()];
    const y = dateObj.getFullYear();
    return `${d} ${m} ${y}`;
  }
}
