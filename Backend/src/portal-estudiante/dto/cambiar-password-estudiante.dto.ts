import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CambiarPasswordEstudianteDto {
  @ApiProperty({
    description: 'Contraseña actual del estudiante',
    example: 'Temporal123!',
  })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  @IsString()
  passwordActual: string;

  @ApiProperty({
    description: 'Nueva contraseña elegida por el estudiante',
    example: 'NuevaClaveSegura123!',
  })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
    {
      message:
        'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  passwordNueva: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NuevaClaveSegura123!',
  })
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @IsString()
  confirmarPassword: string;
}
