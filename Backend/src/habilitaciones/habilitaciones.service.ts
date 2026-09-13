import { Injectable } from '@nestjs/common';
import { CreateHabilitacioneDto } from './dto/create-habilitacione.dto';
import { UpdateHabilitacioneDto } from './dto/update-habilitacione.dto';

@Injectable()
export class HabilitacionesService {
  create(createHabilitacioneDto: CreateHabilitacioneDto) {
    return 'This action adds a new habilitacione';
  }

  findAll() {
    return `This action returns all habilitaciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} habilitacione`;
  }

  update(id: number, updateHabilitacioneDto: UpdateHabilitacioneDto) {
    return `This action updates a #${id} habilitacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} habilitacione`;
  }
}
