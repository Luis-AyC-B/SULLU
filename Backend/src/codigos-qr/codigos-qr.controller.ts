import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CodigosQrService } from './codigos-qr.service';
import { CreateCodigosQrDto } from './dto/create-codigos-qr.dto';
import { UpdateCodigosQrDto } from './dto/update-codigos-qr.dto';

@Controller('codigos-qr')
export class CodigosQrController {
  constructor(private readonly codigosQrService: CodigosQrService) {}

  @Post()
  create(@Body() createCodigosQrDto: CreateCodigosQrDto) {
    return this.codigosQrService.create(createCodigosQrDto);
  }

  @Get()
  findAll() {
    return this.codigosQrService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.codigosQrService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCodigosQrDto: UpdateCodigosQrDto,
  ) {
    return this.codigosQrService.update(+id, updateCodigosQrDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.codigosQrService.remove(+id);
  }
}
