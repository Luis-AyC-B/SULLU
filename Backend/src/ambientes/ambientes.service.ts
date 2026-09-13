import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';

export interface CreateAmbienteDto {
  codigo: string;
  ubicacion: string;
  capacidad: number;
  estado?: 'Disponible' | 'En uso' | 'Inactivo';
}

@Injectable()
export class AmbientesService {
  private ambientes = [
    { id: '1', codigo: 'Aula-101', ubicacion: 'Edificio Central', capacidad: 50, estado: 'Disponible' },
  ];

  async create(dto: CreateAmbienteDto) {
    const { codigo, ubicacion, capacidad, estado } = dto;

    // Validación de campos obligatorios
    if (!codigo || !ubicacion || capacidad === undefined) {
      throw new BadRequestException('El código, ubicación y capacidad son obligatorios');
    }

    // Validación de capacidad positiva
    if (capacidad <= 0) {
      throw new BadRequestException('La capacidad debe ser un número entero positivo');
    }

    // Detección de código duplicado
    const existe = this.ambientes.find((a) => a.codigo === codigo);
    if (existe) {
      throw new ConflictException('Ya existe un ambiente con este código');
    }

    const nuevoAmbiente = {
      id: Date.now().toString(),
      codigo,
      ubicacion,
      capacidad,
      estado: estado || 'Disponible',
    };

    this.ambientes.push(nuevoAmbiente);
    return nuevoAmbiente;
  }

  async updateEstado(id: string, nuevoEstado: 'Disponible' | 'En uso' | 'Inactivo') {
    const ambiente = this.ambientes.find((a) => a.id === id);
    if (!ambiente) {
      throw new BadRequestException('Ambiente no encontrado');
    }

    ambiente.estado = nuevoEstado;
    return ambiente;
  }
}