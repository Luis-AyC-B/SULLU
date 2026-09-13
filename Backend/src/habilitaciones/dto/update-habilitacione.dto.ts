import { PartialType } from '@nestjs/swagger';
import { CreateHabilitacioneDto } from './create-habilitacione.dto';

export class UpdateHabilitacioneDto extends PartialType(
  CreateHabilitacioneDto,
) {}
