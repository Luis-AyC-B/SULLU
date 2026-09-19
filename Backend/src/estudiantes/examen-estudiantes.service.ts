import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // AJUSTAR si tu ruta es otra
import { QueryEstudiantesExamenDto } from './dto/query-estudiantes-examen.dto';
import { CreateEstudianteExamenDto } from './dto/create-estudiante-examen.dto';

@Injectable()
export class ExamenEstudiantesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
