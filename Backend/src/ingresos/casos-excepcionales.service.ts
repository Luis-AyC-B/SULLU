import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarCasoExcepcionalDto } from './dto/registrar-caso-excepcional.dto';

type ExamenConHorario = {
  estado: EstadoExamen;
  reservaAmbiente: {
    fecha: Date;
    horarioFijo: { horaIni: Date; horaFin: Date };
  };
};

export function horarioCasoExamen(examen: ExamenConHorario) {
  const {
    fecha,
    horarioFijo: { horaIni, horaFin },
  } = examen.reservaAmbiente;
  const base = Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
  // DATE y TIME son valores institucionales; los instantes se interpretan en Bolivia (UTC-4).
  const inicio =
    base +
    (horaIni.getUTCHours() + 4) * 3600000 +
    horaIni.getUTCMinutes() * 60000;
  let fin =
    base +
    (horaFin.getUTCHours() + 4) * 3600000 +
    horaFin.getUTCMinutes() * 60000;
  if (fin <= inicio) fin += 86400000;
  return { inicio: new Date(inicio), fin: new Date(fin) };
}

export function estadoCasoExamen(
  examen: ExamenConHorario,
  ahora = new Date(),
): EstadoExamen {
  if (
    examen.estado === EstadoExamen.CANCELADO ||
    examen.estado === EstadoExamen.FINALIZADO
  )
    return examen.estado;
  const { inicio, fin } = horarioCasoExamen(examen);
  if (ahora >= fin) return EstadoExamen.FINALIZADO;
  return ahora >= inicio || examen.estado === EstadoExamen.EN_CURSO
    ? EstadoExamen.EN_CURSO
    : EstadoExamen.PROGRAMADO;
}

export function conflictoIngreso(ingreso: {
  fechaHora: Date;
  metodo: string;
  caso_excepcional?: string | null;
  casoExcepcional?: string | null;
}) {
  const hora = ingreso.fechaHora.toLocaleTimeString('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const caso = ingreso.casoExcepcional ?? ingreso.caso_excepcional;

  return new ConflictException({
    code: 'ESTUDIANTE_YA_REGISTRADO',
    message: `El estudiante ya registró su ingreso a las ${hora}${caso ? ' mediante un caso excepcional; verifica su carnet' : ''}.`,
    horaIngresoPrevio: hora,
    fechaHora: ingreso.fechaHora.toISOString(),
    metodo: ingreso.metodo,
    casoExcepcional: caso ?? null,
  });
}

export function filaRegistroIngreso(
  i: {
    id: number;
    fechaHora: Date;
    metodo: string;
    caso_excepcional?: string | null;
    casoExcepcional?: string | null;
    estudiante: {
      cod_sis: string;
      nombre: string;
      apellido: string | null;
      ci: string | null;
    };
  },
  habilitado = true,
) {
  const caso = i.casoExcepcional ?? i.caso_excepcional;
  return {
    id: i.id,
    hora: i.fechaHora.toISOString(),
    sis: i.estudiante.cod_sis,
    estudiante: `${i.estudiante.nombre} ${i.estudiante.apellido ?? ''}`.trim(),
    ci: i.estudiante.ci,
    metodo: String(i.metodo).toUpperCase() === 'QR' ? 'QR' : 'Manual',
    estado: caso || habilitado ? 'Habilitado' : 'Inhabilitado',
    casoExcepcional: caso ?? null,
  };
}

@Injectable()
export class CasosExcepcionalesService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    dto: RegistrarCasoExcepcionalDto,
    usuarioId: number,
    ip?: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const docente = await tx.usuario.findFirst({
          where: {
            id: usuarioId,
            deletedAt: null,
            roles: {
              some: {
                rol: {
                  nombre: 'Docente',
                  deletedAt: null,
                  permisos: {
                    some: {
                      permiso: {
                        clave: 'casos_excepcionales.registrar',
                        modulo: { activo: true },
                      },
                    },
                  },
                },
              },
            },
          },
          select: { id: true },
        });
        if (!docente)
          throw new ForbiddenException(
            'Solo un docente autorizado puede registrar casos excepcionales.',
          );
        // Serializa los casos del examen y protege la inscripción mientras se confirma.
        await tx.$queryRaw`SELECT id FROM examenes WHERE id=${dto.examenId} FOR UPDATE`;
        const examen = await tx.examen.findUnique({
          where: { id: dto.examenId },
          include: {
            reservaAmbiente: { include: { horarioFijo: true } },
          },
        });
        if (!examen) throw new NotFoundException('El examen no existe.');
        if (examen.usuarioId !== usuarioId)
          throw new ForbiddenException('El examen pertenece a otro docente.');
        const ahora = new Date();
        const estado = estadoCasoExamen(examen, ahora);
        if (
          estado === EstadoExamen.FINALIZADO ||
          estado === EstadoExamen.CANCELADO ||
          examen.reservaAmbiente.estado === 'CANCELADO'
        ) {
          throw new ConflictException('El examen está finalizado o cancelado.');
        }
        const estudiante = await tx.estudiante.findUnique({
          where: { cod_sis: dto.codigoSis },
        });
        if (!estudiante)
          throw new NotFoundException(
            'No se encontraron estudiantes de este examen con ese código SIS.',
          );
        await tx.$queryRaw`SELECT id_estudiante FROM examen_estudiante WHERE id_examen=${dto.examenId} AND id_estudiante=${estudiante.id} FOR UPDATE`;
        const inscripcion = await tx.examen_Estudiante.findUnique({
          where: {
            estudianteId_examenId: {
              estudianteId: estudiante.id,
              examenId: dto.examenId,
            },
          },
        });
        if (!inscripcion)
          throw new NotFoundException(
            'El estudiante no pertenece a este examen.',
          );
        if (!inscripcion.estado_habilitado)
          throw new ConflictException({
            code: 'ESTUDIANTE_INHABILITADO',
            message: 'El estudiante está inhabilitado.',
            motivoInhabilitacion: inscripcion.motivo_inhabilitacion,
          });
        const previo = await tx.ingreso.findFirst({
          where: { examenId: dto.examenId, estudianteId: estudiante.id },
        });
        if (previo) throw conflictoIngreso(previo);
        await tx.$queryRaw`SELECT set_config('app.usuario_id',${String(usuarioId)},true),set_config('app.ip',${ip?.slice(0, 45) ?? ''},true)`;

        const ingreso = await tx.ingreso.create({
          data: {
            examenId: dto.examenId,
            estudianteId: estudiante.id,
            registradoPor: usuarioId,
            metodo: 'MANUAL',
            fechaHora: ahora,
            esOffline: false,
          },
          include: { estudiante: true },
        });

        // Funciona tanto en HU20 sola como al integrar HU21, sin duplicar el evento del trigger.
        const auditado = await tx.bitacora_Auditoria.findFirst({
          where: {
            tablaAfectada: 'ingresos',
            registroId: ingreso.id,
            accion: 'CREACION',
          },
          select: { id: true },
        });

        if (!auditado) {
          await tx.bitacora_Auditoria.create({
            data: {
              usuarioId,
              accion: 'CREACION',
              modulo: 'HU20',
              tablaAfectada: 'ingresos',
              registroId: ingreso.id,
              ipOrigen: ip?.slice(0, 45),
              detallesNuevo: {
                id: ingreso.id,
                estudiante_id: estudiante.id,
                examen_id: dto.examenId,
                registrado_por: usuarioId,
                metodo: 'MANUAL',
                caso_excepcional: dto.motivo,
                fecha_hora: ahora.toISOString(),
              },
            },
          });
        }

        // Inyectamos el motivo manualmente para el formateo de retorno
        return filaRegistroIngreso({
          ...ingreso,
          caso_excepcional: dto.motivo,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const previo = await this.prisma.ingreso.findFirst({
          where: {
            examenId: dto.examenId,
            estudiante: { cod_sis: dto.codigoSis },
          },
        });
        if (previo) throw conflictoIngreso(previo);
        throw new ConflictException('El ingreso ya fue registrado.');
      }
      throw error;
    }
  }
}
