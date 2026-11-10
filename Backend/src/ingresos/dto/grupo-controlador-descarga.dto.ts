import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EstudianteGrupoItemDto {
  @ApiProperty({ description: 'ID del estudiante', example: 101 })
  id!: number;

  @ApiProperty({ description: 'Código SIS', example: '202100123' })
  codSis!: string;

  @ApiPropertyOptional({
    description: 'Cédula de identidad',
    example: '1234567',
  })
  ci?: string;

  @ApiProperty({ description: 'Nombre del estudiante', example: 'Ana' })
  nombre!: string;

  @ApiProperty({ description: 'Apellido del estudiante', example: 'Alvarez' })
  apellido!: string;

  @ApiProperty({
    description: 'Estado habilitado para rendir el examen',
    example: true,
  })
  estadoHabilitado!: boolean;

  @ApiProperty({
    description: 'Indica si ya registró ingreso al examen',
    example: false,
  })
  yaIngreso!: boolean;

  @ApiPropertyOptional({
    description: 'Hora de ingreso previo (HH:mm)',
    example: '08:45',
  })
  horaIngresoPrevio?: string;

  @ApiPropertyOptional({
    description: 'Método de verificación del ingreso previo',
    enum: ['QR', 'MANUAL'],
    example: 'QR',
  })
  metodoIngresoPrevio?: 'QR' | 'MANUAL';
}

export class GrupoControladorDescargaDto {
  @ApiProperty({ description: 'ID del examen', example: 1 })
  examenId!: number;

  @ApiProperty({
    description: 'Nombre de la materia',
    example: 'Bases de Datos I',
  })
  asignatura!: string;

  @ApiProperty({
    description: 'Ambiente o aula del examen',
    example: 'Laboratorio Informática 1',
  })
  ambiente!: string;

  @ApiProperty({
    description: 'ID de usuario del colaborador / controlador',
    example: 5,
  })
  colaboradorId!: number;

  @ApiProperty({
    description: 'Nombre completo del controlador',
    example: 'Luciana Pedraza',
  })
  nombreControlador!: string;

  @ApiProperty({
    description: 'Rol asignado al controlador',
    example: 'Control principal',
  })
  rolAsignacion!: string;

  @ApiProperty({ description: 'Rango alfabético asignado', example: 'A - G' })
  rango!: string;

  @ApiProperty({ description: 'Letra inicial del rango', example: 'A' })
  letraInicio!: string;

  @ApiProperty({ description: 'Letra final del rango', example: 'G' })
  letraFin!: string;

  @ApiProperty({
    description: 'Cantidad de estudiantes asignados a este grupo',
    example: 15,
  })
  totalEstudiantesGrupo!: number;

  @ApiProperty({
    description: 'Cantidad total de estudiantes habilitados en el examen',
    example: 30,
  })
  totalEstudiantesExamen!: number;

  @ApiProperty({
    description: 'Lista de estudiantes asignados a este grupo/fila',
    type: [EstudianteGrupoItemDto],
  })
  estudiantes!: EstudianteGrupoItemDto[];
}
