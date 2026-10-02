import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RecuperarPasswordDto {
  @ApiProperty({
    example: 'usuario@umss.edu.bo',
    description: 'Correo electrónico registrado del usuario',
  })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;
}

export class ResetearPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido en el correo',
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description: 'Nueva contraseña para la cuenta',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
