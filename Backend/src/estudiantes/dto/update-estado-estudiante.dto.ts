import { IsBoolean, IsString, ValidateIf } from 'class-validator';

export class UpdateEstadoEstudianteDto {
  @IsBoolean({ message: 'estado_habilitado debe ser true o false' })
  estado_habilitado!: boolean;

  @ValidateIf((o: UpdateEstadoEstudianteDto) => o.estado_habilitado === false)
  @IsString({ message: 'El motivo de inhabilitación es obligatorio' })
  motivo_inhabilitacion?: string;
}
