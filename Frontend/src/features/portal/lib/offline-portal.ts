import type {
  ExamenEstudiante,
  StudentProfile,
  StudentQrPayload,
} from '../types/student-exam.types';
import type { Examen } from '../types/qr-examen';

const STORAGE_PREFIX = 'exacontrol_offline_';
export const CACHED_EXAMENES_KEY = `${STORAGE_PREFIX}examenes`;
export const CACHED_QR_KEY = `${STORAGE_PREFIX}qr`;
export const CACHED_EXAM_QRS_KEY = `${STORAGE_PREFIX}exam_qrs`;
export const CACHED_PERFIL_KEY = `${STORAGE_PREFIX}perfil`;
export const SESION_PORTAL_KEY = `${STORAGE_PREFIX}sesion_ok`;
export const CACHED_USUARIO_KEY = `${STORAGE_PREFIX}usuario`;

export interface CachedData<T> {
  data: T;
  cachedAt: string; // ISO string
}

export interface CachedExamQr {
  examenId: number | string;
  qrUrl: string;
  token?: string;
  vigenteHasta: string; // ISO string
  generadoAt: string; // ISO string
}

export function guardarExamenesOffline(examenes: (Examen | ExamenEstudiante)[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedData<(Examen | ExamenEstudiante)[]> = {
      data: examenes,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHED_EXAMENES_KEY, JSON.stringify(payload));
  } catch {}
}


export function guardarUsuarioOffline(usuario: { nombre: string; rol: string }): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_USUARIO_KEY, JSON.stringify(usuario));
  } catch {}
}

export function obtenerUsuarioOffline(): { nombre: string; rol: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_USUARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function obtenerExamenesOffline(): CachedData<(Examen | ExamenEstudiante)[]> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_EXAMENES_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function guardarQrOffline(qr: StudentQrPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedData<StudentQrPayload> = {
      data: qr,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHED_QR_KEY, JSON.stringify(payload));
  } catch {}
}

export function obtenerQrOffline(): CachedData<StudentQrPayload> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_QR_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Guarda el perfil del estudiante para mostrarlo (nombre, SIS, foto) sin conexión.
 */
export function guardarPerfilOffline(perfil: StudentProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedData<StudentProfile> = {
      data: perfil,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHED_PERFIL_KEY, JSON.stringify(payload));
  } catch {}
}

export function obtenerPerfilOffline(): CachedData<StudentProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_PERFIL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Marca que este dispositivo tuvo una sesión de estudiante válida estando online.
 * Permite que StudentAuthGuard deje entrar sin red (solo lectura de datos ya guardados).
 */
export function marcarSesionPortal(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESION_PORTAL_KEY, '1');
  } catch {}
}

export function haySesionPortalOffline(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SESION_PORTAL_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Guarda el QR generado para un examen específico en caché offline.
 */
export function guardarQrExamenOffline(
  examenId: number | string,
  data: { qrUrl: string; vigenteHasta: string; token?: string },
): void {
  if (typeof window === 'undefined') return;
  try {
    const todos = obtenerTodosQrsExamenOffline();
    todos[String(examenId)] = {
      examenId,
      qrUrl: data.qrUrl,
      token: data.token,
      vigenteHasta: data.vigenteHasta,
      generadoAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHED_EXAM_QRS_KEY, JSON.stringify(todos));
  } catch {}
}

/**
 * Retorna todos los QRs de exámenes almacenados offline.
 */
export function obtenerTodosQrsExamenOffline(): Record<string, CachedExamQr> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHED_EXAM_QRS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Retorna el QR de un examen específico si existe y sigue vigente.
 */
export function obtenerQrExamenOffline(examenId: number | string): CachedExamQr | null {
  if (typeof window === 'undefined') return null;
  const todos = obtenerTodosQrsExamenOffline();
  const cached = todos[String(examenId)];
  if (!cached) return null;

  // Si ya venció en el dispositivo, no se devuelve
  if (new Date(cached.vigenteHasta).getTime() <= Date.now()) {
    return null;
  }
  return cached;
}

/**
 * Purga del almacenamiento offline todos los QRs de examen cuya fecha de vigencia haya expirado.
 * Regla de negocio:
 * 1. Elimina QRs de examen vencidos de CACHED_EXAM_QRS_KEY.
 * 2. Si un examen en CACHED_EXAMENES_KEY tenía qrGenerado: true pero expiró, actualiza su estado.
 * 3. IMPORTANTE: El QR personal del estudiante (CACHED_QR_KEY) NUNCA se purga por expiración de examen.
 *
 * @param fechaReferencia Fecha actual (permite inyectar tiempo en tests)
 * @returns Cantidad de QRs de examen purgados
 */
export function purgarQrsExamenVencidos(fechaReferencia: Date = new Date()): number {
  if (typeof window === 'undefined') return 0;
  let purgados = 0;
  const ahoraTime = fechaReferencia.getTime();

  try {
    // 1. Purga del diccionario de QRs de examen
    const todos = obtenerTodosQrsExamenOffline();
    const restantes: Record<string, CachedExamQr> = {};

    Object.entries(todos).forEach(([id, item]) => {
      const itemTime = new Date(item.vigenteHasta).getTime();
      if (itemTime <= ahoraTime) {
        purgados++;
      } else {
        restantes[id] = item;
      }
    });

    if (purgados > 0) {
      localStorage.setItem(CACHED_EXAM_QRS_KEY, JSON.stringify(restantes));
    }

    // 2. Actualización de lista de exámenes cacheados para reflejar QRs vencidos
    const cachedExamenes = obtenerExamenesOffline();
    if (cachedExamenes && Array.isArray(cachedExamenes.data)) {
      let huboCambios = false;
      const actualizados = cachedExamenes.data.map((ex) => {
        const examenObj = ex as Partial<Examen>;
        if (
          examenObj.qrVigenteHasta &&
          new Date(examenObj.qrVigenteHasta).getTime() <= ahoraTime &&
          examenObj.qrGenerado
        ) {
          huboCambios = true;
          return {
            ...ex,
            qrGenerado: false,
            qrUrl: null,
            token: null,
            estadoQr: 'FINALIZADO',
          };
        }
        return ex;
      });

      if (huboCambios) {
        localStorage.setItem(
          CACHED_EXAMENES_KEY,
          JSON.stringify({
            data: actualizados,
            cachedAt: cachedExamenes.cachedAt,
          }),
        );
      }
    }
  } catch {}

  return purgados;
}

/**
 * Borra el almacenamiento local sensible al cerrar sesión (voluntaria o por 401).
 * Limpia exámenes, perfil, marca de sesión, QR personal y QRs de examen.
 */
export function limpiarCacheOfflineEstudiante(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHED_EXAMENES_KEY);
    localStorage.removeItem(CACHED_QR_KEY);
    localStorage.removeItem(CACHED_EXAM_QRS_KEY);
    localStorage.removeItem(CACHED_PERFIL_KEY);
    localStorage.removeItem(SESION_PORTAL_KEY);
    localStorage.removeItem(CACHED_USUARIO_KEY);
  } catch {}
}