import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, TipoIncidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';
import { SincronizarIngresosDto } from './dto/sincronizar-ingresos.dto';
import { VerificarIngresoQrDto } from './dto/verificar-ingreso-qr.dto';

@Injectable()
export class IngresosService {
  constructor(private readonly prisma: PrismaService) {}

  async registrarIngresoManual(
    dto: RegistrarIngresoManualDto,
    registradoPorId: number,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: dto.examenId },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    if (examen.estado === EstadoExamen.CANCELADO) {
      throw new BadRequestException('El examen se encuentra cancelado');
    }

    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException('El examen ya ha finalizado');
    }

    const identificador = dto.identificador.trim();

    const estudiante = await this.prisma.estudiante.findFirst({
      where: {
        OR: [{ cod_sis: identificador }, { ci: identificador }],
      },
    });

    if (!estudiante) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          codSisIngresado: identificador,
          ciIngresado: identificador,
          tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
          descripcion: 'Estudiante no registrado en el sistema',
        },
      });
      throw new NotFoundException('Estudiante no registrado en el sistema');
    }

    const inscripcion = await this.prisma.examen_Estudiante.findUnique({
      where: {
        estudianteId_examenId: {
          estudianteId: estudiante.id,
          examenId: dto.examenId,
        },
      },
    });

    if (!inscripcion) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion: 'El estudiante no figura en la nómina de este examen',
        },
      });
      throw new BadRequestException(
        'El estudiante no figura en la nómina de este examen',
      );
    }

    if (!inscripcion.estado_habilitado) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion:
            inscripcion.motivo_inhabilitacion || 'Estudiante inhabilitado',
        },
      });
      throw new BadRequestException(
        `Estudiante no habilitado: ${inscripcion.motivo_inhabilitacion || 'Sin motivo especificado'}`,
      );
    }

    const ingresoExistente = await this.prisma.ingreso.findFirst({
      where: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
      },
    });

    if (ingresoExistente) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
          descripcion: 'Intento de reingreso al examen',
        },
      });
      throw new ConflictException(
        'El estudiante ya registró su ingreso a este examen',
      );
    }

    if (dto.clienteSyncId) {
      const syncExistente = await this.prisma.ingreso.findUnique({
        where: { clienteSyncId: dto.clienteSyncId },
      });
      if (syncExistente) {
        throw new ConflictException(
          'Este registro de sincronización ya fue procesado',
        );
      }
    }

    const nuevoIngreso = await this.prisma.ingreso.create({
      data: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
        registradoPor: registradoPorId,
        fechaHora: new Date(),
        metodo: 'MANUAL',
        esOffline: false,
        clienteSyncId: dto.clienteSyncId,
      },
      include: {
        estudiante: {
          select: {
            id: true,
            cod_sis: true,
            nombre: true,
            apellido: true,
            ci: true,
          },
        },
        examen: {
          select: {
            id: true,
            tipoExamen: true,
          },
        },
      },
    });

    return {
      mensaje: 'Ingreso registrado exitosamente',
      ingreso: nuevoIngreso,
    };
  }

  async registrarIngresoQr(
    dto: VerificarIngresoQrDto,
    registradoPorId: number,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: dto.examenId },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    if (examen.estado === EstadoExamen.CANCELADO) {
      throw new BadRequestException('El examen se encuentra cancelado');
    }

    if (examen.estado === EstadoExamen.FINALIZADO) {
      throw new BadRequestException('El examen ya ha finalizado');
    }

    const tokenLimpio = dto.token.trim();

    const qrRegistro = await this.prisma.codigoQr.findUnique({
      where: { token: tokenLimpio },
      include: {
        estudiante: true,
      },
    });

    if (!qrRegistro) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
          descripcion: 'Código QR no reconocido o inexistente',
        },
      });
      throw new NotFoundException('Código QR no válido o inexistente');
    }

    if (new Date() > qrRegistro.expiraEn) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: qrRegistro.estudianteId,
          tipoIncidencia: TipoIncidencia.QR_CADUCADO,
          descripcion: 'El código QR ha expirado',
        },
      });
      throw new BadRequestException('El código QR presentado ha expirado');
    }

    const estudiante = qrRegistro.estudiante;

    const inscripcion = await this.prisma.examen_Estudiante.findUnique({
      where: {
        estudianteId_examenId: {
          estudianteId: estudiante.id,
          examenId: dto.examenId,
        },
      },
    });

    if (!inscripcion) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion: 'El estudiante no figura en la nómina de este examen',
        },
      });
      throw new BadRequestException(
        'El estudiante no figura en la nómina de este examen',
      );
    }

    if (!inscripcion.estado_habilitado) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.NO_HABILITADO,
          descripcion:
            inscripcion.motivo_inhabilitacion || 'Estudiante inhabilitado',
        },
      });
      throw new BadRequestException(
        `Estudiante no habilitado: ${inscripcion.motivo_inhabilitacion || 'Sin motivo especificado'}`,
      );
    }

    const ingresoExistente = await this.prisma.ingreso.findFirst({
      where: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
      },
    });

    if (ingresoExistente) {
      await this.prisma.incidenciaIngreso.create({
        data: {
          examenId: dto.examenId,
          registradoPor: registradoPorId,
          estudianteId: estudiante.id,
          tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
          descripcion: 'Intento de reingreso con código QR',
        },
      });
      throw new ConflictException(
        'El estudiante ya registró su ingreso a este examen',
      );
    }

    if (dto.clienteSyncId) {
      const syncExistente = await this.prisma.ingreso.findUnique({
        where: { clienteSyncId: dto.clienteSyncId },
      });
      if (syncExistente) {
        throw new ConflictException(
          'Este registro de sincronización ya fue procesado',
        );
      }
    }

    const nuevoIngreso = await this.prisma.ingreso.create({
      data: {
        estudianteId: estudiante.id,
        examenId: dto.examenId,
        registradoPor: registradoPorId,
        fechaHora: new Date(),
        metodo: 'QR',
        esOffline: false,
        clienteSyncId: dto.clienteSyncId,
      },
      include: {
        estudiante: {
          select: {
            id: true,
            cod_sis: true,
            nombre: true,
            apellido: true,
            ci: true,
          },
        },
        examen: {
          select: {
            id: true,
            tipoExamen: true,
          },
        },
      },
    });

    return {
      mensaje: 'Ingreso por QR registrado exitosamente',
      ingreso: nuevoIngreso,
    };
  }

  async sincronizarEnLote(
    dto: SincronizarIngresosDto,
    registradoPorId: number,
  ) {
    const sincronizados: unknown[] = [];
    const omitidos: { clienteSyncId: string; motivo: string }[] = [];
    const rechazados: { clienteSyncId: string; motivo: string }[] = [];

    for (const item of dto.ingresos) {
      const yaExiste = await this.prisma.ingreso.findUnique({
        where: { clienteSyncId: item.clienteSyncId },
      });

      if (yaExiste) {
        omitidos.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Registro ya sincronizado previamente',
        });
        continue;
      }

      const examen = await this.prisma.examen.findUnique({
        where: { id: item.examenId },
      });

      if (!examen) {
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Examen no encontrado',
        });
        continue;
      }

      const identificador = item.identificador.trim();
      let estudianteId: number | null = null;

      if (item.metodo.toUpperCase() === 'QR') {
        const qrRegistro = await this.prisma.codigoQr.findUnique({
          where: { token: identificador },
        });
        if (qrRegistro) {
          estudianteId = qrRegistro.estudianteId;
        }
      }

      if (!estudianteId) {
        const estudiante = await this.prisma.estudiante.findFirst({
          where: {
            OR: [{ cod_sis: identificador }, { ci: identificador }],
          },
        });
        if (estudiante) {
          estudianteId = estudiante.id;
        }
      }

      if (!estudianteId) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            codSisIngresado: identificador,
            tipoIncidencia: TipoIncidencia.NO_ENCONTRADO,
            descripcion:
              'Estudiante no reconocido durante sincronización offline',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Estudiante no encontrado en el sistema',
        });
        continue;
      }

      const inscripcion = await this.prisma.examen_Estudiante.findUnique({
        where: {
          estudianteId_examenId: {
            estudianteId,
            examenId: item.examenId,
          },
        },
      });

      if (!inscripcion) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            estudianteId,
            tipoIncidencia: TipoIncidencia.NO_HABILITADO,
            descripcion:
              'Estudiante no figura en nómina (sincronización offline)',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'Estudiante no figura en la nómina de este examen',
        });
        continue;
      }

      if (!inscripcion.estado_habilitado) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            estudianteId,
            tipoIncidencia: TipoIncidencia.NO_HABILITADO,
            descripcion:
              inscripcion.motivo_inhabilitacion || 'Estudiante inhabilitado',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: `Estudiante inhabilitado: ${inscripcion.motivo_inhabilitacion || 'Sin motivo'}`,
        });
        continue;
      }

      const ingresoExistente = await this.prisma.ingreso.findFirst({
        where: {
          estudianteId,
          examenId: item.examenId,
        },
      });

      if (ingresoExistente) {
        await this.prisma.incidenciaIngreso.create({
          data: {
            examenId: item.examenId,
            registradoPor: registradoPorId,
            estudianteId,
            tipoIncidencia: TipoIncidencia.DOBLE_MARCACION,
            descripcion: 'Doble marcación detectada en sincronización offline',
          },
        });
        rechazados.push({
          clienteSyncId: item.clienteSyncId,
          motivo: 'El estudiante ya tenía un ingreso registrado previamente',
        });
        continue;
      }

      const nuevoIngreso = await this.prisma.ingreso.create({
        data: {
          estudianteId,
          examenId: item.examenId,
          registradoPor: registradoPorId,
          fechaHora: item.fechaHora ? new Date(item.fechaHora) : new Date(),
          metodo: item.metodo.toUpperCase(),
          esOffline: true,
          clienteSyncId: item.clienteSyncId,
        },
        include: {
          estudiante: {
            select: {
              id: true,
              cod_sis: true,
              nombre: true,
              apellido: true,
              ci: true,
            },
          },
        },
      });

      sincronizados.push(nuevoIngreso);
    }

    return {
      mensaje: 'Sincronización completada',
      totalRecibidos: dto.ingresos.length,
      totalSincronizados: sincronizados.length,
      totalOmitidos: omitidos.length,
      totalRechazados: rechazados.length,
      sincronizados,
      omitidos,
      rechazados,
    };
  }

  async findByExamen(examenId: number) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });

    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }

    return this.prisma.ingreso.findMany({
      where: { examenId },
      include: {
        estudiante: {
          select: {
            id: true,
            cod_sis: true,
            nombre: true,
            apellido: true,
            ci: true,
          },
        },
      },
      orderBy: { fechaHora: 'desc' },
    });
  }
}
