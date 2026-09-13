import { Injectable } from '@nestjs/common';
import { CreateCargasEstudianteDto } from './dto/create-cargas-estudiante.dto';
import { UpdateCargasEstudianteDto } from './dto/update-cargas-estudiante.dto';

@Injectable()
export class CargasEstudiantesService {
  create(createCargasEstudianteDto: CreateCargasEstudianteDto) {
    return 'This action adds a new cargasEstudiante';
  }

  findAll() {
    return `This action returns all cargasEstudiantes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cargasEstudiante`;
  }

  update(id: number, updateCargasEstudianteDto: UpdateCargasEstudianteDto) {
    return `This action updates a #${id} cargasEstudiante`;
  }

  remove(id: number) {
    return `This action removes a #${id} cargasEstudiante`;
  }
}
