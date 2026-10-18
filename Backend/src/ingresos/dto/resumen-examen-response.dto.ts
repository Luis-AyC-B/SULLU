import { ApiProperty } from '@nestjs/swagger';

export class UltimoIngresoItemDto {
  @ApiProperty({ description: 'ID del registro de ingreso', example: 1 })
  id!: number;

  @ApiProperty({
    description: 'Nombre completo del estudiante',
    example: 'Alejandro Morales Rojas',
  })
  nombre!: string;

  @ApiProperty({
    description: 'Código SIS del estudiante',
    example: '201901234',
  })
  codSis!: string;

  @ApiProperty({
    description: 'Hora registrada del ingreso (HH:mm)',
    example: '08:47',
  })
  hora!: string;

  @ApiProperty({
    description: 'Método utilizado para verificar el ingreso',
    enum: ['QR', 'MANUAL'],
    example: 'QR',
  })
  metodo!: 'QR' | 'MANUAL';
}

export class ResumenExamenResponseDto {
  @ApiProperty({ description: 'ID del examen', example: 1 })
  examenId!: number;

  @ApiProperty({
    description: 'Nombre de la materia',
    example: 'Bases de Datos I',
  })
  asignatura!: string;

  @ApiProperty({
    description: 'Nombre del aula o ambiente',
    example: 'Laboratorio Informática 1 (FCyT)',
  })
  ambiente!: string;

  @ApiProperty({
    description: 'Horario del examen',
    example: '08:15–09:45',
  })
  horario!: string;

  @ApiProperty({
    description: 'Estado operativo del examen',
    enum: ['EN_CURSO', 'PROXIMO', 'FINALIZADO'],
    example: 'EN_CURSO',
  })
  estado!: 'EN_CURSO' | 'PROXIMO' | 'FINALIZADO';

  @ApiProperty({
    description: 'Total de estudiantes habilitados para rendir el examen',
    example: 10,
  })
  totalHabilitados!: number;

  @ApiProperty({
    description: 'Cantidad de estudiantes que ya ingresaron',
    example: 6,
  })
  ingresados!: number;

  @ApiProperty({
    description: 'Cantidad de estudiantes aún pendientes de ingreso',
    example: 4,
  })
  pendientes!: number;

  @ApiProperty({
    description: 'Cantidad de incidencias registradas para este examen',
    example: 2,
  })
  incidencias!: number;

  @ApiProperty({
    description: 'Últimos estudiantes ingresados al examen',
    type: [UltimoIngresoItemDto],
  })
  ultimosIngresos!: UltimoIngresoItemDto[];
}
