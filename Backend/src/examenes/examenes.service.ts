import { Injectable } from '@nestjs/common';
import { CreateExameneDto } from './dto/create-examene.dto';
import { UpdateExameneDto } from './dto/update-examene.dto';

@Injectable()
export class ExamenesService {
  create(createExameneDto: CreateExameneDto) {
    return 'This action adds a new examene';
  }

  findAll() {
    return `This action returns all examenes`;
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
