import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';

const incluir = {
  estudiante: true,
  controlador: true,
} as const;

type Fila = {
  id: number;
  examenId: number;
  fechaHora: Date;
  descripcion: string | null;
  tipoIncidencia: string;
  codSisIngresado: string | null;
  nombreReferencial: string | null;
  estudiante: {
    cod_sis: string;
    nombre: string;
    apellido: string | null;
  } | null;
  controlador: { nombre: string; apellido: string | null };
};

const nombre = (n: string, a?: string | null) => `${n} ${a ?? ''}`.trim();

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  private aDto(f: Fila) {
    return {
      id: String(f.id),
      examenId: String(f.examenId),
      fechaHora: f.fechaHora.toISOString(),
      codigoSis: f.estudiante?.cod_sis ?? f.codSisIngresado ?? '',
      estudianteNombre: f.estudiante
        ? nombre(f.estudiante.nombre, f.estudiante.apellido)
        : (f.nombreReferencial ?? ''),
      motivo: f.tipoIncidencia,
      observaciones: f.descripcion,
      registradoPor: nombre(f.controlador.nombre, f.controlador.apellido),
    };
  }

  /** Control: examen asignado. Docente: examen propio. */
  private async validarAcceso(examenId: number, usuarioId: number) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
      select: { id: true, usuarioId: true },
    });
    if (!examen) {
      throw new NotFoundException({
        code: 'EXAMEN_INVALIDO',
        message: 'El examen no existe',
      });
    }
    if (examen.usuarioId === usuarioId) return;
    const asignado = await this.prisma.examenControlador.findUnique({
      where: { examenId_colaboradorId: { examenId, colaboradorId: usuarioId } },
    });
    if (!asignado) {
      throw new ForbiddenException('No tienes permiso sobre este examen.');
    }
  }

  async listar(examenId: number, usuarioId: number) {
    await this.validarAcceso(examenId, usuarioId);
    const filas = await this.prisma.incidenciaIngreso.findMany({
      where: { examenId },
      orderBy: { fechaHora: 'desc' },
      include: incluir,
    });
    return filas.map((f) => this.aDto(f as Fila));
  }

  async crear(dto: CrearIncidenciaDto, usuarioId: number, ip?: string) {
    const examenId = Number(dto.examenId);
    if (!Number.isInteger(examenId)) {
      throw new NotFoundException({
        code: 'EXAMEN_INVALIDO',
        message: 'El examen no es válido',
      });
    }
    await this.validarAcceso(examenId, usuarioId);

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { cod_sis: dto.codigoSis },
    });
    if (!estudiante) {
      throw new NotFoundException({
        code: 'SIS_NO_EXISTE',
        message: 'El código SIS ingresado no existe',
      });
    }

    // fechaHora (default now()) y registradoPor los define el servidor
    const creada = await this.prisma.incidenciaIngreso.create({
      data: {
        examenId,
        registradoPor: usuarioId,
        estudianteId: estudiante.id,
        tipoIncidencia: dto.motivo,
        descripcion: dto.observaciones || null,
      },
      include: incluir,
    });

    await this.prisma.bitacora_Auditoria.create({
      data: {
        usuarioId,
        accion: 'CREAR_INCIDENCIA',
        modulo: 'Incidencias',
        tablaAfectada: 'incidencia_ingreso',
        registroId: creada.id,
        detallesNuevo: {
          examenId,
          codigoSis: dto.codigoSis,
          motivo: dto.motivo,
        },
        ipOrigen: ip?.slice(0, 45),
      },
    });
    return this.aDto(creada);
  }
}
