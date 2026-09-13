import { PartialType } from '@nestjs/swagger';
import { CreateCargasEstudianteDto } from './create-cargas-estudiante.dto';

export class UpdateCargasEstudianteDto extends PartialType(
  CreateCargasEstudianteDto,
) {}
