import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ExamenesService } from './examenes.service';
import { CreateExameneDto } from './dto/create-examene.dto';
import { UpdateExameneDto } from './dto/update-examene.dto';
import { QueryExamenesDto } from './dto/query-examenes.dto';

@Controller('examenes')
export class ExamenesController {
  constructor(private readonly examenesService: ExamenesService) {}

  @Post()
  create(@Body() createExameneDto: CreateExameneDto) {
    return this.examenesService.create(createExameneDto);
  }

  // Task 14
  @Get()
  findAll(@Query() query: QueryExamenesDto) {
    return this.examenesService.findAllParaSelector(query);
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
