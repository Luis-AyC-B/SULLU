import { PartialType } from '@nestjs/swagger';
import { CreateExameneDto } from './create-examene.dto';

export class UpdateExameneDto extends PartialType(CreateExameneDto) {}
