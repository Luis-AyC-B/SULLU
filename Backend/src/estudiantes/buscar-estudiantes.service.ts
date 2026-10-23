import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EstudianteBusquedaResultado {
  id: number;
  nombre: string;
  apellido: string;
  codSis: string;
  ci: string;
  carrera?: string;
}

@Injectable()
export class BuscarEstudiantesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza texto eliminando acentos/tildes y convirtiendo a minúsculas
   */
  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Busca estudiantes por código SIS, carnet (CI) o nombre con normalización de mayúsculas y tildes
   */
  async buscar(termino: string): Promise<EstudianteBusquedaResultado[]> {
    if (!termino || termino.trim().length < 2) {
      throw new BadRequestException(
        'El término de búsqueda debe tener al menos 2 caracteres',
      );
    }

    const termLimpio = termino.trim();
    const termNormalizado = this.normalizarTexto(termLimpio);

    // Consulta en base de datos
    const estudiantes = await this.prisma.estudiante.findMany({
      where: {
        OR: [
          { cod_sis: { contains: termLimpio, mode: 'insensitive' } },
          { ci: { contains: termLimpio, mode: 'insensitive' } },
          { nombre: { contains: termLimpio, mode: 'insensitive' } },
          { apellido: { contains: termLimpio, mode: 'insensitive' } },
        ],
      },
      take: 50,
      orderBy: { apellido: 'asc' },
    });

    // Filtro adicional en memoria para garantizar matching insensible a acentos/tildes
    const resultados = estudiantes.filter((est) => {
      const sis = (est.cod_sis || '').toLowerCase();
      const ci = (est.ci || '').toLowerCase();
      const nombreNorm = this.normalizarTexto(
        `${est.nombre} ${est.apellido || ''}`,
      );

      return (
        sis.includes(termNormalizado) ||
        ci.includes(termNormalizado) ||
        nombreNorm.includes(termNormalizado)
      );
    });

    return resultados.map((est) => ({
      id: est.id,
      nombre: est.nombre,
      apellido: est.apellido || '',
      codSis: est.cod_sis,
      ci: est.ci || '',
      carrera: 'Ingeniería de Sistemas',
    }));
  }
}
