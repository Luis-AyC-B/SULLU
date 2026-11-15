import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegistrarCasoExcepcionalDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  examenId!: number;

  @ApiProperty({ example: '201901234' })
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  codigoSis!: string;

  @ApiProperty({ example: 'Cita médica a las 08:00', maxLength: 50 })
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  motivo!: string;
}
