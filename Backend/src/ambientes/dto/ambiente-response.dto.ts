import { ApiProperty } from '@nestjs/swagger';

export class CatalogoAmbienteDto {
  @ApiProperty() id!: number;
  @ApiProperty() nombre!: string;
}
export class AmbienteResponseDto {
  @ApiProperty() id!: number;
  @ApiProperty() nombre!: string;
  @ApiProperty() capacidad!: number;
  @ApiProperty({ enum: ['HABILITADO', 'EN_REMODELACION', 'INHABILITADO'] })
  estado!: string;
  @ApiProperty({ required: false }) facultadId?: number;
  @ApiProperty({ required: false }) tipoAulaId?: number;
  @ApiProperty() facultad!: string;
  @ApiProperty() tipoAula!: string;
}
