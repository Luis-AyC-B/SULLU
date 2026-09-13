import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';

export interface CreateExamenDto {
  asignatura: string;
  fecha: string; // Formato YYYY-MM-DD
  hora: string;
  duracionMinutos: number;
  ambienteId: string;
  normas?: string;
}

@Injectable()
export class ExamenesService {
  private examenes: any[] = [];

  async create(createExamenDto: CreateExamenDto, docenteId: string) {
    const { asignatura, fecha, hora, duracionMinutos, ambienteId, normas } = createExamenDto;

    // Criterio 2: Campos obligatorios y duración positiva
    if (!asignatura || !fecha || !hora || !ambienteId || !duracionMinutos) {
      throw new BadRequestException('Todos los campos obligatorios deben ser completados');
    }

    if (duracionMinutos <= 0) {
      throw new BadRequestException('La duración debe ser un número positivo');
    }

    // Criterio 4: Fecha no debe ser pasada
    const fechaExamen = new Date(`${fecha}T${hora}`);
    if (fechaExamen < new Date()) {
      throw new BadRequestException('No se puede registrar un examen en una fecha u hora pasada');
    }

    // Criterio 3: Cruce de horarios en el mismo ambiente
    const conflicto = this.examenes.find(
      (e) => e.ambienteId === ambienteId && e.fecha === fecha && e.hora === hora,
    );

    if (conflicto) {
      throw new ConflictException('Ya existe un examen programado en este ambiente, fecha y hora');
    }

    // Criterio 1 y 5: Creación con docente asignado automáticamente y estado "Programado"
    const nuevoExamen = {
      id: Date.now().toString(),
      asignatura,
      fecha,
      hora,
      duracionMinutos,
      ambienteId,
      normas: normas || '',
      docenteId,
      estado: 'Programado',
    };

    this.examenes.push(nuevoExamen);
    return nuevoExamen;
  }

  async findAll() {
    return this.examenes;
  }
}