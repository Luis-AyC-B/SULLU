import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginEstudianteDto {
  @IsString()
  @IsNotEmpty({ message: 'El código SIS es obligatorio' })
  @Matches(/^\d+$/, { message: 'El código SIS solo admite números' })
  sis: string;

  @IsString()
  @IsNotEmpty({ message: 'El CI es obligatorio' })
  ci: string;
}