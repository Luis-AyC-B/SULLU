import { ApiProperty } from '@nestjs/swagger';
export class ReservaResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() ambienteId!: number;
  @ApiProperty() ambienteNombre!: string;
  @ApiProperty() facultad!: string;
  @ApiProperty({ format: 'date' }) fecha!: string;
  @ApiProperty() horarioFijoId!: number;
  @ApiProperty() periodoNombre!: string;
  @ApiProperty({ example: '08:15' }) horaIni!: string;
  @ApiProperty({ example: '09:45' }) horaFin!: string;
  @ApiProperty({ enum: ['RESERVADO', 'CANCELADO', 'FINALIZADO'] })
  estado!: string;
  @ApiProperty({ nullable: true, type: String }) examenAsociado!: string | null;
  @ApiProperty() tieneExamenAsignado!: boolean;
}
