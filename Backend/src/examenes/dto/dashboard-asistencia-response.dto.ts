import { ApiProperty } from '@nestjs/swagger';

export class DashboardAsistenciaResponseDto {
  @ApiProperty({ example: 1, description: 'Identificador del examen' })
  examenId: number;

  @ApiProperty({
    example: 'Sistemas Operativos',
    description: 'Nombre de la materia',
  })
  materia: string;

  @ApiProperty({
    example: 'Segundo parcial',
    description: 'Tipo o título del examen',
  })
  tipoExamen: string;

  @ApiProperty({
    example: 'Ingeniería de Sistemas',
    description: 'Nombre de la carrera',
  })
  carrera: string;

  @ApiProperty({
    example: 'Aula B-201 (FCyT)',
    description: 'Ambiente o aula asignada',
  })
  ambiente: string;

  @ApiProperty({
    example: '2026-10-28',
    description: 'Fecha del examen en formato YYYY-MM-DD',
  })
  fecha: string;

  @ApiProperty({
    example: '11:15 - 12:45',
    description: 'Rango de horario fijado',
  })
  horario: string;

  @ApiProperty({
    example: 'Vladimir Costas Cuba',
    description: 'Nombre completo del docente responsable',
  })
  docente: string;

  @ApiProperty({
    example: 'EN_CURSO',
    enum: ['EN_CURSO', 'PROXIMO', 'FINALIZADO', 'CANCELADO'],
    description: 'Estado dinámico del examen según su horario y fecha',
  })
  estado: 'EN_CURSO' | 'PROXIMO' | 'FINALIZADO' | 'CANCELADO';

  @ApiProperty({
    example: 10,
    description: 'Cantidad de estudiantes habilitados',
  })
  habilitados: number;

  @ApiProperty({
    example: 7,
    description: 'Cantidad de estudiantes presentes (con ingreso registrado)',
  })
  presentes: number;

  @ApiProperty({
    example: 3,
    nullable: true,
    description:
      'Cantidad de estudiantes ausentes (null si el examen aún no inicia)',
  })
  ausentes: number | null;

  @ApiProperty({
    example: 70,
    description: 'Porcentaje de presentes sobre habilitados (0 a 100)',
  })
  porcentajePresentes: number;

  @ApiProperty({
    example: 30,
    description: 'Porcentaje de ausentes sobre habilitados (0 a 100)',
  })
  porcentajeAusentes: number;

  @ApiProperty({
    example: false,
    description:
      'Indica true si el examen aún no ha iniciado (para ocultar ausentes y mostrar aviso)',
  })
  examenAunNoInicia: boolean;

  @ApiProperty({
    example: '2026-10-30T18:00:00.000Z',
    description: 'Timestamp ISO de la última actualización de métricas',
  })
  ultimaActualizacion: string;
}
