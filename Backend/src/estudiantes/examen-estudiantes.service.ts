import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // AJUSTAR si tu ruta es otra
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';
import { UpdateEstadoEstudianteDto } from './dto/update-estado-estudiante.dto';
import { parsearCsvEstudiantes } from '../cargas-estudiantes/cargas-estudiantes.parser';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExamenEstudiantesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Task 7 - GET listar estudiantes por examen
  // ==========================================
  async findByExamen(examenId: number, query: QueryEstudiantesExamenDto) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });
    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }
    // TODO: validación 403 "responsable del examen o Administrador"

    const { q, estado, page, limit } = query;

    const where = {
      examenId,
      ...(estado && { estado_habilitado: estado === 'habilitado' }),
      ...(q && {
        estudiante: {
          OR: [
            { nombre: { contains: q, mode: 'insensitive' as const } },
            { apellido: { contains: q, mode: 'insensitive' as const } },
            { cod_sis: { contains: q, mode: 'insensitive' as const } },
            { ci: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.examen_Estudiante.count({ where }),
      this.prisma.examen_Estudiante.findMany({
        where,
        include: { estudiante: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { estudiante: { apellido: 'asc' } },
      }),
    ]);

    return {
      total,
      page,
      limit,
      data: data.map((ee) => ({
        estudiante_id: ee.estudianteId,
        cod_sis: ee.estudiante.cod_sis,
        nombre: ee.estudiante.nombre,
        apellido: ee.estudiante.apellido,
        ci: ee.estudiante.ci,
        estado_habilitado: ee.estado_habilitado,
        motivo_inhabilitacion: ee.motivo_inhabilitacion,
      })),
    };
  }

  // ==========================================
  // Task 9 - POST registro manual individual
  // ==========================================
  async registrarManual(examenId: number, dto: CreateEstudianteExamenDto) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });
    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }
    // TODO: validación 403 "responsable del examen o Administrador"

    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar o crear en el catálogo global por cod_sis
      let estudiante = await tx.estudiante.findUnique({
        where: { cod_sis: dto.cod_sis },
      });

      let advertencia: string | undefined;
      let estudiante_reutilizado = false;

      if (!estudiante) {
        estudiante = await tx.estudiante.create({
          data: {
            cod_sis: dto.cod_sis,
            nombre: dto.nombre,
            apellido: dto.apellido,
            ci: dto.ci,
          },
        });
      } else {
        estudiante_reutilizado = true;
        // Si el código existe con otro nombre: se reutiliza SIN modificar
        const nombreDistinto =
          estudiante.nombre !== dto.nombre ||
          estudiante.apellido !== dto.apellido;
        if (nombreDistinto) {
          advertencia = `El código ${dto.cod_sis} ya existe registrado como "${estudiante.nombre} ${estudiante.apellido ?? ''}". Se usó el registro existente sin modificarlo.`;
        }
      }

      // 2. Verificar si ya está vinculado a este examen
      const yaVinculado = await tx.examen_Estudiante.findUnique({
        where: {
          estudianteId_examenId: {
            estudianteId: estudiante.id,
            examenId,
          },
        },
      });

      if (yaVinculado) {
        throw new ConflictException(
          'El estudiante ya está registrado en este examen',
        );
      }

      // 3. Vincular al examen con estado inicial Habilitado
      const vinculo = await tx.examen_Estudiante.create({
        data: {
          estudianteId: estudiante.id,
          examenId,
          estado_habilitado: true,
        },
      });

      return {
        estudiante: {
          estudiante_id: estudiante.id,
          cod_sis: estudiante.cod_sis,
          nombre: estudiante.nombre,
          apellido: estudiante.apellido,
          ci: estudiante.ci,
          estado_habilitado: vinculo.estado_habilitado,
        },
        estudiante_reutilizado,
        ...(advertencia && { advertencia }),
      };
    });
  }

  // ==========================================
  // Task 8 - POST carga masiva (CSV)
  // ==========================================
  async cargaMasiva(examenId: number, archivo?: Express.Multer.File) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });
    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }
    // TODO: validación 403 "responsable del examen o Administrador"

    if (!archivo) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    if (archivo.size > MAX_SIZE) {
      throw new PayloadTooLargeException(
        'El archivo excede el tamaño máximo de 2 MB',
      );
    }

    const nombreArchivo = archivo.originalname?.toLowerCase() ?? '';
    if (!nombreArchivo.endsWith('.csv')) {
      throw new BadRequestException('Formato de archivo no soportado');
    }

    const { totalFilas, validas, rechazados } = parsearCsvEstudiantes(
      archivo.buffer,
    );

    let estudiantes_creados = 0;
    let estudiantes_reutilizados = 0;
    let vinculados_nuevos = 0;
    let ya_vinculados = 0;

    if (validas.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const fila of validas) {
          const estudianteExistente = await tx.estudiante.findUnique({
            where: { cod_sis: fila.cod_sis },
          });

          const estudiante = await tx.estudiante.upsert({
            where: { cod_sis: fila.cod_sis },
            update: {},
            create: {
              cod_sis: fila.cod_sis,
              nombre: fila.nombre,
              apellido: fila.apellido,
              ci: fila.ci,
            },
          });

          if (estudianteExistente) {
            estudiantes_reutilizados++;
          } else {
            estudiantes_creados++;
          }

          const vinculoExistente = await tx.examen_Estudiante.findUnique({
            where: {
              estudianteId_examenId: {
                estudianteId: estudiante.id,
                examenId,
              },
            },
          });

          if (vinculoExistente) {
            ya_vinculados++;
            continue; // no pisar estado existente (ej. un Inhabilitado)
          }

          try {
            await tx.examen_Estudiante.create({
              data: {
                estudianteId: estudiante.id,
                examenId,
                estado_habilitado: true,
              },
            });
            vinculados_nuevos++;
          } catch (err: unknown) {
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === 'P2002'
            ) {
              ya_vinculados++;
            } else {
              throw err;
            }
          }
        }
      });
    }

    return {
      resumen: {
        total_filas: totalFilas,
        procesadas: validas.length,
        rechazadas: rechazados.length,
        estudiantes_creados,
        estudiantes_reutilizados,
        vinculados_nuevos,
        ya_vinculados,
      },
      rechazados,
    };
  }

  // ==========================================
  // Task 10 - PATCH actualizar estado de habilitación
  // ==========================================
  async actualizarEstado(
    examenId: number,
    estudianteId: number,
    dto: UpdateEstadoEstudianteDto,
  ) {
    const examen = await this.prisma.examen.findUnique({
      where: { id: examenId },
    });
    if (!examen) {
      throw new NotFoundException('Examen no encontrado');
    }
    // TODO: validación 403 "responsable del examen o Administrador"

    const vinculo = await this.prisma.examen_Estudiante.findUnique({
      where: {
        estudianteId_examenId: {
          estudianteId,
          examenId,
        },
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Estudiante no registrado en el examen');
    }

    const actualizado = await this.prisma.examen_Estudiante.update({
      where: {
        estudianteId_examenId: {
          estudianteId,
          examenId,
        },
      },
      data: {
        estado_habilitado: dto.estado_habilitado,
        // Si se habilita, el motivo se borra; si se inhabilita, se guarda el motivo recibido
        motivo_inhabilitacion: dto.estado_habilitado
          ? null
          : dto.motivo_inhabilitacion,
      },
    });

    return {
      estudiante_id: actualizado.estudianteId,
      examen_id: actualizado.examenId,
      estado_habilitado: actualizado.estado_habilitado,
      motivo_inhabilitacion: actualizado.motivo_inhabilitacion,
    };
  }
}
