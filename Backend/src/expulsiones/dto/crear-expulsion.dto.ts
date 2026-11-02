import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const MOTIVOS_EXPULSION = [
  'Material no autorizado',
  'Uso de celular',
  'Comunicación entre estudiantes',
  'Suplantación de identidad',
  'Otro',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearExpulsionDto {
  @IsString()
  @IsNotEmpty({ message: 'El examen es obligatorio' })
  examenId!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El estudiante es obligatorio' })
  codigoSis!: string;

  @IsIn(MOTIVOS_EXPULSION, { message: 'El motivo no es válido' })
  motivo!: (typeof MOTIVOS_EXPULSION)[number];

  // Solo espacios => vacío
  @Transform(trim)
  @IsString({ message: 'El detalle es obligatorio' })
  @IsNotEmpty({ message: 'El detalle es obligatorio' })
  @MaxLength(500, { message: 'El detalle no puede superar los 500 caracteres' })
  detalle!: string;

  // Sin hora ni docente: con whitelist: true se descartan si el cliente los manda.
}
