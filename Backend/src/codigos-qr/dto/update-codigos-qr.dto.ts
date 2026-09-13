import { PartialType } from '@nestjs/swagger';
import { CreateCodigosQrDto } from './create-codigos-qr.dto';

export class UpdateCodigosQrDto extends PartialType(CreateCodigosQrDto) {}
