import { PerfilError } from '../api/student-profile.service';
import { FOTO_MAX_KB, FOTO_MIN_PX, type PerfilErrorCode } from '../types/student-profile.types';

const MENSAJES: Record<PerfilErrorCode, string> = {
  PASSWORD_ACTUAL_INCORRECTA: 'La contraseña actual es incorrecta.',
  FOTO_INVALIDA: `No pudimos aceptar la fotografía. Usa un JPG o PNG de hasta ${FOTO_MAX_KB} KB y de ${FOTO_MIN_PX} × ${FOTO_MIN_PX} px o más.`,
  NETWORK_ERROR: 'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.',
  SERVER_ERROR: 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.',
};

/** Convierte cualquier error del perfil en un mensaje listo para mostrar. */
export function mensajePerfilError(error: unknown): string {
  const code: PerfilErrorCode = error instanceof PerfilError ? error.code : 'SERVER_ERROR';
  return MENSAJES[code];
}