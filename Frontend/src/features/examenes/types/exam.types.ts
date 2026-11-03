export type ExamStatus = "Programado" | "En curso" | "Finalizado" | "Desactivado";

export type ExamType = "Primer parcial" | "Segundo parcial" | "Examen final" | "Segunda instancia";

export interface Exam {
  id: string;
  materiaId: string;
  materiaNombre: string;
  carreraId: string;
  carreraNombre: string;
  facultadId: string;
  facultadNombre: string;
  tipoExamen: ExamType;
  ambienteId: string;
  ambienteNombre: string;
  fecha: string;         
  horaInicio: string;    
  horaFin?: string;       
  duracionMinutos: number;
  habilitadosCount: number;
  presentesCount?: number;
  ausentesCount?: number | null;
  estadoCalculado?: string;
  normas?: string;
  docenteId: string;
  docenteNombre: string;
  estado: ExamStatus;
  createdAt: string;
  isEdited?: boolean;
  fueEditado?: boolean; 
}

export interface ExamFilters {
  facultadId: string;
  carreraId: string;
  materiaId: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface MateriaOption {
  id: string;
  nombre: string;
  carreraId: string;
  carreraNombre: string;
  facultadId: string;
  facultadNombre: string;
}

export interface AmbienteOption {
  id: string;
  nombre: string;
  horarioDisponible: string;
}

export type BackendExamEstado = "EN_CURSO" | "PROXIMO" | "FINALIZADO" | "CANCELADO";

export interface DashboardAsistencia {
  examenId: number;
  materia: string;
  tipoExamen: string;
  carrera: string;
  ambiente: string;
  fecha: string;
  horario: string;
  docente: string;
  estado: BackendExamEstado | ExamStatus | string;
  habilitados: number;
  presentes: number;
  ausentes: number | null;
  porcentajePresentes: number;
  porcentajeAusentes: number;
  examenAunNoInicia: boolean;
  ultimaActualizacion: string;
}
