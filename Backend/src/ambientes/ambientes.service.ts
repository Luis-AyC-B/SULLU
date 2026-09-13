import { Injectable } from '@nestjs/common';
import { CreateAmbienteDto } from './dto/create-ambiente.dto';
import { UpdateAmbienteDto } from './dto/update-ambiente.dto';

@Injectable()
export class AmbientesService {
  create(createAmbienteDto: CreateAmbienteDto) {
    return 'This action adds a new ambiente';
  }

  findAll() {
    return `This action returns all ambientes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ambiente`;
  }

  update(id: number, updateAmbienteDto: UpdateAmbienteDto) {
    return `This action updates a #${id} ambiente`;
  }

  remove(id: number) {
    return `This action removes a #${id} ambiente`;
  }
}
