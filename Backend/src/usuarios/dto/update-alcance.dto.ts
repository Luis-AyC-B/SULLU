import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class UpdateAlcanceDto {
  @ApiProperty({
    example: [{ facultadId: 1, carreraId: 2, materiaId: 3 }],
    description:
      'carreraId y materiaId son opcionales (0 o null): sin carrera = toda la facultad; sin materia = toda la carrera',
  })
  @IsArray()
  alcances!: {
    facultadId: number;
    carreraId?: number | null;
    materiaId?: number | null;
  }[];
}
