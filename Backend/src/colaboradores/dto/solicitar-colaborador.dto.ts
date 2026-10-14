import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SolicitarColaboradorDto {
  @IsOptional()
  @IsEmail({}, { message: 'Formato de correo electrónico inválido' })
  email?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Formato de correo electrónico inválido' })
  correo?: string;

  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @IsString({ message: 'Los nombres deben ser texto' })
  nombres!: string;

  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @IsString({ message: 'Los apellidos deben ser texto' })
  apellidos!: string;

  /**
   * Helper para obtener el email normalizado independientemente de si vino como 'email' o 'correo'
   */
  getEmail(): string {
    return (this.email || this.correo || '').trim().toLowerCase();
  }
}
