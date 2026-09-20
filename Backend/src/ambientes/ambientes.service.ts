import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AmbienteDb {
  id: number;
  nombre: string;
  capacidad: number | null;
  horarioDisponible: string | null;
}

@Injectable()
export class AmbientesService {
  async findAll() {
    const ambientes =
      (await prisma.ambiente.findMany()) as unknown as AmbienteDb[];
    return ambientes
      .filter((a) => !a.nombre.toLowerCase().includes('lab'))
      .map((a) => ({
        id: a.id,
        nombre: a.nombre,
        capacidad: a.capacidad ?? 30,
        horarioDisponible:
          a.horarioDisponible || 'Lunes a Viernes | 08:00 am - 12:00 pm',
      }));
  }

  findOne(id: number) {
    return `This action returns a #${id} ambiente`;
  }

  create(createAmbienteDto: any) {
    return 'This action adds a new ambiente';
  }

  update(id: number, updateAmbienteDto: any) {
    return `This action updates a #${id} ambiente`;
  }

  remove(id: number) {
    return `This action removes a #${id} ambiente`;
  }
}
