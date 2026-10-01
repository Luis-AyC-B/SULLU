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

  // Preferido: la reserva concreta (de GET /examenes/mis-ambientes).
  @IsOptional()
  @IsInt({ message: 'La reserva de ambiente debe ser un número.' })
  reservaAmbienteId?: number;

  // Respaldo por compatibilidad con el front actual: se resuelve a la reserva
  // del docente para ese ambiente (si tiene una sola).
  @IsOptional()
  @IsInt({ message: 'El ambiente debe ser un número.' })
  ambienteId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Las normas del examen no pueden exceder los 500 caracteres.',
  })
  normasEx?: string;
}
