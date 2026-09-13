import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CargasEstudiantesService } from './cargas-estudiantes.service';
import { CreateCargasEstudianteDto } from './dto/create-cargas-estudiante.dto';
import { UpdateCargasEstudianteDto } from './dto/update-cargas-estudiante.dto';

@Controller('cargas-estudiantes')
export class CargasEstudiantesController {
  constructor(private readonly cargasEstudiantesService: CargasEstudiantesService) {}

  @Post()
  create(@Body() createCargasEstudianteDto: CreateCargasEstudianteDto) {
    return this.cargasEstudiantesService.create(createCargasEstudianteDto);
  }

  @Get()
  findAll() {
    return this.cargasEstudiantesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cargasEstudiantesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCargasEstudianteDto: UpdateCargasEstudianteDto) {
    return this.cargasEstudiantesService.update(+id, updateCargasEstudianteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cargasEstudiantesService.remove(+id);
  }
}
