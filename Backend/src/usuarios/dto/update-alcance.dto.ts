import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class UpdateAlcanceDto {
  @ApiProperty({ example: [{ facultadId: 1, carreraId: 2, materiaId: 3 }] })
  @IsArray()
  alcances!: { facultadId: number; carreraId: number; materiaId: number }[];
}
