// ==========================================================
// Tipos del módulo de Usuarios (HU: Administración de usuarios)
// Basado en: Usuario, Rol, Usuario_Rol (multi-rol), Modulo
// ==========================================================

/** Versión simplificada de Rol, usada en selects y badges (id como string: mismo tipo que usa el módulo de Roles) */
export interface RolBasico {
  id: string;
  nombre: string;
}

export interface Facultad {
  id: number;
  nombre: string;
}

export interface Carrera {
  id: number;
  nombre: string;
  facultadId: number;
}

export interface Materia {
  id: number;
  nombre: string;
  sigla: string;
  /** IDs de las carreras a las que pertenece la materia (Carrera_Materia) */
  carreraIds: number[];
}

export interface CatalogoAcademico {
  facultades: Facultad[];
  carreras: Carrera[];
  materias: Materia[];
}

/**
 * Alcance de un usuario. carreraId / materiaId son opcionales:
 * - sin carrera (null/0) = toda la facultad
 * - sin materia (null/0) = toda la carrera
 */
export interface UsuarioAlcance {
  facultadId: number;
  carreraId?: number | null;
  materiaId?: number | null;
  facultad?: Facultad | null;
  carrera?: Carrera | null;
  materia?: Materia | null;
}

/** Alcance tal como se envía al backend */
export interface AlcanceInput {
  facultadId: number;
  carreraId?: number | null;
  materiaId?: number | null;
}

/** Usuario tal cual lo devuelve la API */
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string | null;
  /** Soft delete: null/undefined = activo, string = fecha de baja */
  deletedAt?: string | null;
  roles: RolBasico[]; // multi-rol vía Usuario_Rol
  alcances?: UsuarioAlcance[]; // <-- Lista de alcances
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Versión "resumida" ya lista para pintar en la tabla:
 * nombre completo armado, roles como labels, y estado calculado
 * a partir de deletedAt (ver lib/user-mapper.ts)
 */
export interface UsuarioResumen {
  id: number;
  nombreCompleto: string;
  correo: string;
  telefono?: string | null;
  roles: string[]; // labels para los badges (soporta multi-rol)
  activo: boolean; // true si deletedAt es null
}

/**
 * Payload para crear un usuario nuevo.
 * Un usuario puede tener más de un rol (Usuario_Rol), por eso rolesIds
 * es un array; el id de Rol es string (mismo tipo que usa el módulo de Roles).
 * La contraseña temporal la genera el backend y se envía por correo,
 * por eso no viaja en este input.
 */
export interface CreateUsuarioInput {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  rolesIds: string[];
  alcances?: AlcanceInput[];
}

/** Payload para editar un usuario existente */
export interface UpdateUsuarioInput {
  id: number;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  rolesIds?: string[];
  alcances?: AlcanceInput[];
}

/**
 * Payload para reactivar un usuario dado de baja (deletedAt != null)
 * cuando alguien intenta crear una cuenta con un correo que ya existía.
 * La contraseña temporal también la regenera el backend.
 */
export interface ReactivarUsuarioInput {
  correo: string;
  rolesIds: string[];
}

/**
 * Respuesta del backend al crear un usuario: indica si en vez de
 * insertar un registro nuevo, se reactivó uno existente por correo
 */
export interface CreateUsuarioResponse {
  usuario: Usuario;
  reactivado: boolean;
}