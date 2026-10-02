export interface ExamenPublico {
  id: number;
  tipoExamen: string;
  normas?: string;
  materiaId: number;
  materiaNombre: string;
  carreraId: number;
  carreraNombre: string;
  facultadId: number;
  facultadNombre: string;
  docente: string;
  reservaAmbienteId?: number;
  ambienteId: number;
  ambienteNombre: string;
  fecha: string; // 'YYYY-MM-DD'
  horaInicio: string; // 'HH:mm'
  horaFin: string; // 'HH:mm'
  estado: string;
}
