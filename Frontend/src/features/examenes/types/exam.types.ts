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
  fecha: string;          // YYYY-MM-DD
  horaInicio: string;     // ej: "09:45"
  horaFin?: string;       // ej: "11:15"
  duracionMinutos: number;
  habilitadosCount: number;
  normas?: string;
  docenteId: string;
  docenteNombre: string;
  estado: ExamStatus;
  createdAt: string;
  isEdited?: boolean; 
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