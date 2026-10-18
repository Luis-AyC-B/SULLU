import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';
export class QueryDisponibilidadDto {
  @ApiProperty({
    description: 'Fecha civil America/La_Paz, desde hoy hasta un mes adelante',
    example: '2026-10-15',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;
}
