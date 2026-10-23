import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CargasEstudiantesService } from '../cargas-estudiantes/cargas-estudiantes.service';
import {
  parsearCsvEstudiantes,
  DOMINIOS_ESTUDIANTE,
  esCorreoInstitucionalValido,
} from '../cargas-estudiantes/cargas-estudiantes.parser';
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';
import { UpdateEstadoEstudianteDto } from './dto/update-estado-estudiante.dto';

@Injectable()
export class ExamenEstudiantesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cargasEstudiantesService: CargasEstudiantesService,
  ) {}

  // ==========================================
  // Task 7 - GET lista paginada de estudiantes por examen
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
        include: {
          estudiante: {
            include: {
              usuario: true,
            },
          },
        },
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
        correo:
          ee.estudiante.usuario?.correo ??
          `${ee.estudiante.cod_sis.toLowerCase()}@est.umss.edu.bo`,
        estado_habilitado: ee.estado_habilitado,
        motivo_inhabilitacion: ee.motivo_inhabilitacion,
      })),
    };
  }

  // Alias para compatibilidad
  listarEstudiantesPorExamen(
    examenId: number,
    query: QueryEstudiantesExamenDto,
  ) {
    return this.findByExamen(examenId, query);
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

    const codSisLimpio = dto.cod_sis.trim();
    const correoGenerado = `${codSisLimpio.toLowerCase()}@est.umss.edu.bo`;
    let correoFinal = correoGenerado;

    if (dto.correo) {
      const correoLimpio = dto.correo.trim().toLowerCase();
      if (!esCorreoInstitucionalValido(correoLimpio)) {
        throw new BadRequestException(
          `El correo debe pertenecer a un dominio institucional válido (${DOMINIOS_ESTUDIANTE.join(', ')})`,
        );
      }
      correoFinal = correoLimpio;
    }

    const resultado =
      await this.cargasEstudiantesService.procesarEstudiantesParaExamen(
        examenId,
        [
          {
            fila: 1,
            nombre: dto.nombre.trim(),
            apellido: dto.apellido.trim(),
            cod_sis: codSisLimpio,
            ci: dto.ci?.trim() || null,
            correo: correoFinal,
          },
        ],
        1,
        [],
        [],
      );

    if (resultado.rechazados.length > 0) {
      throw new BadRequestException(resultado.rechazados[0].motivo);
    }

    const info = resultado.resultadosPorSis.get(codSisLimpio);
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
        correo: correoFinal,
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

    const { totalFilas, validas, rechazados, avisos } = parsearCsvEstudiantes(
      archivo.buffer,
    );

    return this.cargasEstudiantesService.procesarEstudiantesParaExamen(
      examenId,
      validas,
      totalFilas,
      rechazados,
      avisos,
    );
  }

  // ==========================================
  // Task 10 - PATCH inhabilitar / habilitar estudiante
  // ==========================================
  async actualizarEstado(
    examenId: number,
    estudianteId: number,
    dto: UpdateEstadoEstudianteDto,
  ) {
    const vinculo = await this.prisma.examen_Estudiante.findUnique({
      where: {
        estudianteId_examenId: { estudianteId, examenId },
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Estudiante no encontrado en este examen');
    }

    if (!dto.estado_habilitado && !dto.motivo_inhabilitacion?.trim()) {
      throw new BadRequestException(
        'El motivo es obligatorio al inhabilitar a un estudiante',
      );
    }

    return this.prisma.examen_Estudiante.update({
      where: {
        estudianteId_examenId: { estudianteId, examenId },
      },
      data: {
        estado_habilitado: dto.estado_habilitado,
        motivo_inhabilitacion: dto.estado_habilitado
          ? null
          : dto.motivo_inhabilitacion?.trim(),
      },
    });
  }

  cambiarEstado(
    examenId: number,
    estudianteId: number,
    dto: UpdateEstadoEstudianteDto,
  ) {
    return this.actualizarEstado(examenId, estudianteId, dto);
  }
}
