import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamenAsignadoResponseDto {
  @ApiProperty({ description: 'ID del examen', example: 1 })
  id!: number;

  @ApiProperty({
    description: 'Nombre de la materia o asignatura',
    example: 'Bases de Datos I',
  })
  asignatura!: string;

  @ApiPropertyOptional({
    description: 'Sigla de la materia',
    example: 'BD1',
  })
  sigla?: string;

  @ApiPropertyOptional({
    description: 'Nombre del docente responsable',
    example: 'Vladimir Costas Cuba',
  })
  docente?: string;

  @ApiPropertyOptional({
    description: 'Rol de asignación operativa en el examen',
    example: 'Control principal',
  })
  rolAsignacion?: string;

  @ApiProperty({
    description: 'Estado operativo del examen para el control',
    enum: ['EN_CURSO', 'PROXIMO', 'FINALIZADO'],
    example: 'EN_CURSO',
  })
  estado!: 'EN_CURSO' | 'PROXIMO' | 'FINALIZADO';

  @ApiProperty({
    description: 'Total de estudiantes habilitados para el examen',
    example: 10,
  })
  totalEstudiantes!: number;

  @ApiProperty({
    description: 'Fecha del examen o badge textual',
    example: 'Hoy',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Rango de horario de inicio y fin',
    example: '08:15–09:45',
  })
  horario!: string;

  @ApiProperty({
    description: 'Nombre del ambiente o aula asignada',
    example: 'Laboratorio Informática 1 (FCyT)',
  })
  ambiente!: string;

  @ApiPropertyOptional({
    description: 'Capacidad máxima de estudiantes del aula',
    example: 40,
  })
  capacidadAmbiente?: number;

  @ApiPropertyOptional({
    description: 'Tipo o instancia de examen',
    example: 'Primer parcial',
  })
  tipoExamen?: string;
}
