import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ResponderSolicitudDto {
  @IsNotEmpty({ message: 'La acción es obligatoria' })
  @IsString()
  @IsIn(['APROBAR', 'RECHAZAR'], {
    message: 'La acción debe ser APROBAR o RECHAZAR',
  })
  accion!: 'APROBAR' | 'RECHAZAR';
}
