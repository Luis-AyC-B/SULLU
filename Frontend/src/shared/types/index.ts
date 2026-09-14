export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rolId: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  permisos: string[];
}

export interface Estudiante {
  id: string;
  codigoUniversitario: string;
  ci: string;
  nombre: string;
  carrera: string;
}

export interface Examen {
  id: string;
  asignatura: string;
  fecha: string;
  hora: string;
  duracionMin: number;
  ambienteId: string;
  docenteId: string;
}

export interface Ambiente {
  id: string;
  nombre: string;
  capacidad: number;
}