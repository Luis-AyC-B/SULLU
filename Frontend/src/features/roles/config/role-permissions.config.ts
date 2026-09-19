// src/features/roles/config/role-permissions.config.ts
import type { ModuloPermisos } from "../types/role.types";

export const modulosPermisos: ModuloPermisos[] = [
  {
    clave: "usuarios",
    label: "USUARIOS",
    permisoVer: { clave: "usuarios.ver", label: "Ver usuarios" },
    acciones: [
      { clave: "usuarios.crear", label: "Crear usuarios" },
      { clave: "usuarios.editar", label: "Editar usuarios" },
      { clave: "usuarios.desactivar", label: "Desactivar usuarios" },
    ],
  },
  {
    clave: "roles",
    label: "ROLES",
    permisoVer: { clave: "roles.ver", label: "Ver roles" },
    acciones: [
      { clave: "roles.crear", label: "Crear roles" },
      { clave: "roles.editar", label: "Editar roles" },
      { clave: "roles.eliminar", label: "Eliminar roles" },
    ],
  },
  {
    clave: "estudiantes",
    label: "ESTUDIANTES",
    permisoVer: { clave: "estudiantes.ver", label: "Ver estudiantes" },
    acciones: [
      { clave: "estudiantes.registrar", label: "Registrar estudiantes" },
      { clave: "estudiantes.habilitar", label: "Habilitar/inhabilitar" },
    ],
  },
  {
    clave: "examenes",
    label: "EXÁMENES",
    permisoVer: { clave: "examenes.ver", label: "Ver exámenes" },
    acciones: [
      { clave: "examenes.crear", label: "Crear exámenes" },
      { clave: "examenes.editar", label: "Editar exámenes" },
      { clave: "examenes.eliminar", label: "Eliminar exámenes" },
    ],
  },
];