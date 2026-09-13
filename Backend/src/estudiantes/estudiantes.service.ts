import { Injectable } from '@nestjs/common';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';

interface EstudianteInput {
  codigo?: string;
  nombre?: string;
  ci?: string;
  [key: string]: any;
}

@Injectable()
export class EstudiantesService {
  private estudiantes: any[] = [];

  async procesarCargaMasiva(listaEstudiantes: EstudianteInput[]) {
    const registrados: any[] = [];
    const rechazados: any[] = [];
    const codigosProcesados = new Set<string>();

    for (const est of listaEstudiantes) {
      if (!est.codigo) {
        rechazados.push({ ...est, motivo: 'El código de estudiante es obligatorio' });
        continue;
      }

      if (codigosProcesados.has(est.codigo)) {
        rechazados.push({ ...est, motivo: 'código duplicado en el archivo' });
        continue;
      }

      codigosProcesados.add(est.codigo);
      const nuevoEstudiante = { ...est, estado: 'Habilitado', id: Date.now().toString() };
      this.estudiantes.push(nuevoEstudiante);
      registrados.push(nuevoEstudiante);
    }

    return {
      registrados: registrados.length,
      estudiantes: registrados,
      rechazados,
    };
  }

  async inhabilitarEstudiante(id: string) {
    return { id, estado: 'Inhabilitado' };
  }

  create(createEstudianteDto: CreateEstudianteDto) {
    return 'This action adds a new estudiante';
  }

  findAll() {
    return this.estudiantes;
  }

  findOne(id: number) {
    return `This action returns a #${id} estudiante`;
  }

  update(id: number, updateEstudianteDto: UpdateEstudianteDto) {
    return `This action updates a #${id} estudiante`;
  }

  remove(id: number) {
    return `This action removes a #${id} estudiante`;
  }
}