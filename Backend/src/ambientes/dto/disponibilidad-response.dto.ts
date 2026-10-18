import { ApiProperty } from '@nestjs/swagger';

export class PeriodoDisponibleDto {
  @ApiProperty() id!: number;
  @ApiProperty() periodoNombre!: string;
  @ApiProperty({ example: '08:15' }) horaIni!: string;
  @ApiProperty({ example: '09:45' }) horaFin!: string;
  @ApiProperty({ enum: ['LIBRE', 'RESERVADO'] }) estado!: 'LIBRE' | 'RESERVADO';
}
export class DisponibilidadResponseDto {
  @ApiProperty() ambienteId!: number;
  @ApiProperty({ format: 'date' }) fecha!: string;
  @ApiProperty({ format: 'date' }) fechaMin!: string;
  @ApiProperty({ format: 'date' }) fechaMax!: string;
  @ApiProperty({ type: [PeriodoDisponibleDto] })
  periodos!: PeriodoDisponibleDto[];
}
