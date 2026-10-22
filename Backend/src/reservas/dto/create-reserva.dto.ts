import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
export class CreateReservaDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) ambienteId!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) horarioFijoId!: number;
  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;
  // Compatibilidad con el formulario; estos nombres nunca se usan para persistir ni autorizar.
  @ApiPropertyOptional() @IsOptional() @IsString() ambienteNombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() periodoNombre?: string;
}
