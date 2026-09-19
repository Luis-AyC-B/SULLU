import { modulosPermisos } from "../config/role-permissions.config";
import type { Rol, RolResumen } from "../types/role.types";

const TODOS_LOS_PERMISOS = modulosPermisos.flatMap((m) => [
  m.permisoVer,
  ...m.acciones,
]);

const MAX_PREVIEW = 3;

export function rolToResumen(rol: Rol): RolResumen {
  const labels = rol.permisos
    .map((clave) => TODOS_LOS_PERMISOS.find((p) => p.clave === clave)?.label)
    .filter((l): l is string => !!l);

  return {
    ...rol,
    permisosCount: rol.permisos.length,
    permisosPreview: labels.slice(0, MAX_PREVIEW),
  };
}