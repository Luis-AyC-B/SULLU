import { IsNotEmpty, IsString } from 'class-validator';

export class SolicitarColaboradorDto {
  /**
   * Código SIS del estudiante registrado en el sistema.
   * El docente lo selecciona desde el autocompletado del modal.
   */
  @IsNotEmpty({ message: 'El código SIS es obligatorio' })
  @IsString({ message: 'El código SIS debe ser texto' })
  codSis!: string;
}
