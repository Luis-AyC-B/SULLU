import { Usuario, UsuarioResumen } from "../types/user.types";

/**
 * Resuelve el nombre completo, los labels de los roles (multi-rol)
 * y el estado activo/inactivo a partir de deletedAt.
 */
export function mapUsuarioToResumen(usuario: Usuario): UsuarioResumen {
  return {
    id: usuario.id,
    nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
    correo: usuario.correo,
    telefono: usuario.telefono,
    roles: (usuario.roles || []).map((ur: any) => ur.rol?.nombre || ur.nombre || 'Desconocido'),
    activo: !usuario.deletedAt,
  };
}