import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoExamen, TipoIncidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarIngresoManualDto } from './dto/registrar-ingreso-manual.dto';

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
