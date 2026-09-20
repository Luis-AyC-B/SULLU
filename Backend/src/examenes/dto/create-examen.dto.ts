import {
  IsInt,
  IsString,
  IsOptional,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateExamenDto {
  @IsInt({ message: 'La materia es obligatoria.' })
  materiaId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de examen es obligatorio.' })
  tipoExamen!: string;

  @IsInt({ message: 'El ambiente es obligatorio.' })
  ambienteId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Las normas del examen no pueden exceder los 500 caracteres.',
  })
  normasEx?: string;
}
