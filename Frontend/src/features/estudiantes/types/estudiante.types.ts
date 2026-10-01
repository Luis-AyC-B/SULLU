// ==========================================================
// Tipos del módulo de Estudiantes (HU-1: Registrar estudiantes por examen)
// ==========================================================

export type EstadoExamenEnum = "PROGRAMADO" | "EN_CURSO" | "FINALIZADO" | "CANCELADO";

export interface ExamenItem {
  id: number;
  nombreMateria: string;
  sigla: string;
  fecha: string; // ej: "06/09/2026" o "Sin fecha"
  fechaRaw?: string | null;
  tipoExamen?: string;
  estado?: EstadoExamenEnum | string;
  esBloqueado?: boolean; // true si estado es FINALIZADO o CANCELADO
  esPasado?: boolean;
  totalEstudiantes?: number;
  habilitados?: number;
}

export interface EstudianteExamen {
  estudiante_id: number;
  cod_sis: string;
  nombre: string;
  apellido: string;
  ci?: string | null;
  estado_habilitado: boolean;
  motivo_inhabilitacion?: string | null;
}

export type FiltroEstado = "todos" | "habilitado" | "inhabilitado";

export interface CreateEstudianteManualInput {
  nombre: string;
  apellido: string;
  cod_sis: string;
  ci?: string;
}

export interface FilaRechazada {
  fila: number;
  motivo: string;
  cod_sis?: string;
  nombre?: string;
}

export interface ResultadoCargaEstudiantes {
  totalLeidos: number;
  insertadosOReutilizados: number;
  rechazados: number;
  filasRechazadas: FilaRechazada[];
}