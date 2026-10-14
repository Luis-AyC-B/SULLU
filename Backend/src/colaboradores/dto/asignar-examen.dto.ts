import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AsignarExamenDto {
  @IsNotEmpty({ message: 'El ID del examen es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'El ID del examen debe ser un número entero' })
  examenId!: number;

  @IsNotEmpty({ message: 'El ID del colaborador es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'El ID del colaborador debe ser un número entero' })
  colaboradorId!: number;
}
