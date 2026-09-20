// ==========================================================
// Tipos del módulo de Estudiantes (HU-1: Registrar estudiantes por examen)
// ==========================================================
export interface ExamenItem {
    id: number;
    nombreMateria: string;
    sigla: string;
    fecha: string; // ej: "06/09/2026"
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