/**
 * Soporte de sesión y permisos offline para el cliente.
 * Almacena en localStorage los permisos y datos del usuario con sesión activa,
 * permitiendo que la interfaz (sidebar, header, guards <Can>) funcione de forma
 * consistente aunque el navegador se encuentre desconectado.
 */

const OFFLINE_PERMISOS_KEY = "sullu_offline_permisos";
const OFFLINE_USER_KEY = "sullu_offline_user";

export interface OfflineUserData {
  nombre: string;
  rol: string;
  email?: string | null;
  permisos: string[];
}

export function guardarSesionOffline(data: OfflineUserData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_PERMISOS_KEY, JSON.stringify(data.permisos));
    localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(data));
  } catch {
    // Ignorar errores de cuota local
  }
}

export function obtenerPermisosOffline(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_PERMISOS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function obtenerUsuarioOperadorOffline(): OfflineUserData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OFFLINE_USER_KEY);
    return raw ? (JSON.parse(raw) as OfflineUserData) : null;
  } catch {
    return null;
  }
}

export function limpiarSesionOffline(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_PERMISOS_KEY);
    localStorage.removeItem(OFFLINE_USER_KEY);
  } catch {
    // Ignorar
  }
}
