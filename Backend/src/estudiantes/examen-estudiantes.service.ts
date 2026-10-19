import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';
import { UpdateEstadoEstudianteDto } from './dto/update-estado-estudiante.dto';
import {
  parsearCsvEstudiantes,
  esCorreoInstitucionalValido,
  DOMINIOS_ESTUDIANTE,
} from '../cargas-estudiantes/cargas-estudiantes.parser';
import { CargasEstudiantesService } from '../cargas-estudiantes/cargas-estudiantes.service';

@Injectable()
export class ExamenEstudiantesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cargasEstudiantesService: CargasEstudiantesService,
  ) {}

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

    const correoLimpio = dto.correo ? dto.correo.trim().toLowerCase() : null;

    if (correoLimpio && !esCorreoInstitucionalValido(correoLimpio)) {
      throw new BadRequestException(
        `El correo debe pertenecer a un dominio institucional válido (${DOMINIOS_ESTUDIANTE.join(', ')})`,
      );
    }

    const resultado =
      await this.cargasEstudiantesService.procesarEstudiantesParaExamen(
        examenId,
        [
          {
            fila: 1,
            nombre: dto.nombre.trim(),
            apellido: dto.apellido.trim(),
            cod_sis: dto.cod_sis.trim(),
            ci: dto.ci?.trim() || null,
            correo: correoLimpio,
          },
        ],
        1,
        [],
      );

    if (resultado.rechazados.length > 0) {
      throw new BadRequestException(resultado.rechazados[0].motivo);
    }

    const info = resultado.resultadosPorSis.get(dto.cod_sis.trim());
    if (info?.ya_vinculado) {
      throw new ConflictException(
        'El estudiante ya está registrado en este examen',
      );
    }

    return {
      estudiante: {
        estudiante_id: info?.estudianteId,
        cod_sis: dto.cod_sis,
        nombre: dto.nombre,
        apellido: dto.apellido,
        ci: dto.ci ?? null,
        estado_habilitado: info?.estado_habilitado ?? true,
      },
      estudiante_reutilizado: resultado.resumen.estudiantes_reutilizados > 0,
      ...(resultado.avisos[0] && { advertencia: resultado.avisos[0].motivo }),
    };
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

    return this.cargasEstudiantesService.procesarEstudiantesParaExamen(
      examenId,
      validas,
      totalFilas,
      rechazados,
    );
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
