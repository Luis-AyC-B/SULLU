import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
export class UpdateEstadoDto {
  @ApiProperty({
    enum: [
      'HABILITADO',
      'DISPONIBLE',
      'EN_REMODELACION',
      'INHABILITADO',
      'DESHABILITADO',
    ],
  })
  @IsIn([
    'HABILITADO',
    'DISPONIBLE',
    'EN_REMODELACION',
    'INHABILITADO',
    'DESHABILITADO',
  ])
  estado!:
    | 'HABILITADO'
    | 'DISPONIBLE'
    | 'EN_REMODELACION'
    | 'INHABILITADO'
    | 'DESHABILITADO';
}
