import { PartialType } from '@nestjs/mapped-types';
import { CreateExamenDto } from './create-examen.dto';

export class UpdateExamenDto extends PartialType(CreateExamenDto) {}
