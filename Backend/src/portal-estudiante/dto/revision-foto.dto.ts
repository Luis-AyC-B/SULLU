import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RevisionFotoDto {
  @ApiProperty({
    description: 'Decisión del revisor',
    enum: ['APROBAR', 'RECHAZAR'],
    example: 'APROBAR',
  })
  @IsNotEmpty({ message: 'La decisión es obligatoria' })
  @IsIn(['APROBAR', 'RECHAZAR'], { message: 'La decisión debe ser APROBAR o RECHAZAR' })
  decision!: 'APROBAR' | 'RECHAZAR';

  @ApiPropertyOptional({
    description: 'Motivo u observación de la revisión',
    example: 'Identidad validada con documento de identidad físico',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}

