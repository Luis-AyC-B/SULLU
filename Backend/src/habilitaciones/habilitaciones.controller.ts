import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HabilitacionesService } from './habilitaciones.service';
import { CreateHabilitacioneDto } from './dto/create-habilitacione.dto';
import { UpdateHabilitacioneDto } from './dto/update-habilitacione.dto';

@Controller('habilitaciones')
export class HabilitacionesController {
  constructor(private readonly habilitacionesService: HabilitacionesService) {}

  @Post()
  create(@Body() createHabilitacioneDto: CreateHabilitacioneDto) {
    return this.habilitacionesService.create(createHabilitacioneDto);
  }

  @Get()
  findAll() {
    return this.habilitacionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.habilitacionesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHabilitacioneDto: UpdateHabilitacioneDto) {
    return this.habilitacionesService.update(+id, updateHabilitacioneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.habilitacionesService.remove(+id);
  }
}
