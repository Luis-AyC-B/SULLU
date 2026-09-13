import { PartialType } from '@nestjs/swagger';
import { CreateIngresoDto } from './create-ingreso.dto';

export class UpdateIngresoDto extends PartialType(CreateIngresoDto) {}
