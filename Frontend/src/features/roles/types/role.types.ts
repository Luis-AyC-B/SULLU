// src/features/roles/types/role.types.ts

export interface Permiso {
  clave: string; // formato exacto de BD: "<modulo>.<accion>", ej: "examenes.ver", "roles.crear"
  label: string; // texto visible del checkbox
}

export interface ModuloPermisos {
  clave: string;       // "usuarios" | "roles" | "estudiantes" | "examenes" — coincide con Modulo.nombre
  label: string;       // "USUARIOS" (encabezado de la sección en la matriz)
  permisoVer: Permiso; // el checkbox PADRE — siempre "<clave>.ver". Habilitarlo = puede ver el módulo.
  acciones: Permiso[]; // resto de permisos operativos (crear, editar, eliminar/desactivar). NUNCA incluye "ver" — eso vive solo en permisoVer.
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  esPlantilla: boolean;
  colorBadge: "blue" | "red" | "green" | "gray";
  usuariosAsignados: number;
  permisos: string[]; // claves de Permiso asignadas a este rol, vía Rol_Permiso
}

export interface RolResumen extends Rol {
  permisosCount: number;
  permisosPreview: string[];
}