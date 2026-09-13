import { Injectable } from '@nestjs/common';
import { CreateCodigosQrDto } from './dto/create-codigos-qr.dto';
import { UpdateCodigosQrDto } from './dto/update-codigos-qr.dto';

@Injectable()
export class CodigosQrService {
  create(createCodigosQrDto: CreateCodigosQrDto) {
    return 'This action adds a new codigosQr';
  }

  findAll() {
    return `This action returns all codigosQr`;
  }

  findOne(id: number) {
    return `This action returns a #${id} codigosQr`;
  }

  update(id: number, updateCodigosQrDto: UpdateCodigosQrDto) {
    return `This action updates a #${id} codigosQr`;
  }

  remove(id: number) {
    return `This action removes a #${id} codigosQr`;
  }
}
