import type { ExamenEstudiante, StudentQrPayload } from '../types/student-exam.types';
import type { Examen } from '../types/qr-examen';

const STORAGE_PREFIX = 'exacontrol_offline_';
export const CACHED_EXAMENES_KEY = `${STORAGE_PREFIX}examenes`;
export const CACHED_QR_KEY = `${STORAGE_PREFIX}qr`;

export interface CachedData<T> {
  data: T;
  cachedAt: string; // ISO string
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
 * Borra el almacenamiento local sensible al cerrar sesión
 */
export function limpiarCacheOfflineEstudiante(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHED_EXAMENES_KEY);
    localStorage.removeItem(CACHED_QR_KEY);
  } catch {}
}

