import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // AJUSTAR si tu ruta es otra
import { CreateExameneDto } from './dto/create-examene.dto';
import { UpdateExameneDto } from './dto/update-examene.dto';
import { QueryExamenesDto } from './dto/query-examenes.dto';

@Injectable()
export class ExamenesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Task 14 - GET listar exámenes (selector)
  // ==========================================
  async findAllParaSelector(query: QueryExamenesDto) {
    // TODO: filtrar por responsable del usuario autenticado o Administrador
    // cuando el guard de auth esté disponible.

    const { q } = query;

    const examenes = await this.prisma.examen.findMany({
      where: q
        ? {
            carrerasMaterias: {
              some: {
                carrera_materia: {
                  materia: {
                    nombre: { contains: q, mode: 'insensitive' as const },
                  },
                },
              },
            },
          }
        : undefined,
      include: {
        reservaAmbiente: {
          include: { ambiente: true },
        },
        carrerasMaterias: {
          include: {
            carrera_materia: {
              include: { materia: true },
            },
          },
        },
        estado: true,
      },
      orderBy: { creadoEn: 'desc' },
    });

    // Solo entregamos datos en bruto: el frontend arma el texto/formato que necesite.
    return examenes.map((examen) => {
      const materia = examen.carrerasMaterias[0]?.carrera_materia?.materia;

      return {
        examen_id: examen.id,
        materia: materia?.nombre ?? null,
        materia_sigla: materia?.sigla ?? null,
        tipo_examen: examen.tipoExamen,
        fecha: examen.reservaAmbiente?.fecha ?? null,
        hora_inicio: examen.reservaAmbiente?.horaIni ?? null,
        hora_fin: examen.reservaAmbiente?.horaFin ?? null,
        ambiente: examen.reservaAmbiente?.ambiente?.nombre ?? null,
        estado: examen.estado?.nombre ?? null,
      };
    });
  }

  // ==========================================
  // CRUD original (scaffold, sin tocar la lógica existente)
  // ==========================================
  create(createExameneDto: CreateExameneDto) {
    return 'This action adds a new examene';
  }

  findOne(id: number) {
    return `This action returns a #${id} examene`;
  }

  update(id: number, updateExameneDto: UpdateExameneDto) {
    return `This action updates a #${id} examene`;
  }

  remove(id: number) {
    return `This action removes a #${id} examene`;
  }
}
