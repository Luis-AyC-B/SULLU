import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEstudianteExamenDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  nombre!: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString()
  apellido!: string;

  @IsNotEmpty({ message: 'El código (cod_sis) es obligatorio' })
  @IsString()
  cod_sis!: string;

  @IsOptional()
  @IsString()
  ci?: string;
}
