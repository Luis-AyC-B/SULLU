import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { CreateExameneDto } from './dto/create-examene.dto';
import { UpdateExameneDto } from './dto/update-examene.dto';

@Controller('examenes')
export class ExamenesController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Post()
  create(@Body() createExameneDto: CreateExameneDto) {
    return this.examenesService.create(createExameneDto);
  }

  @Get()
  findAll() {
    return this.examenesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examenesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExameneDto: UpdateExameneDto) {
    return this.examenesService.update(+id, updateExameneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examenesService.remove(+id);
  }
}
