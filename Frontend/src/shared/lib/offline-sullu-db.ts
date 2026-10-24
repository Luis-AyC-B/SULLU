/**
 * Base de datos IndexedDB compartida para soporte offline de módulos operador.
 * DB name: "sullu_offline_db"
 *
 * Versiones:
 *   v1 (original): ingresos_cola
 *   v2 (esta migración): + incidencias_cola + examenes_asignados_cache
 *                          + ingresos_vista_cache + incidencias_vista_cache
 *
 * Ubicación: src/shared/lib/offline-sullu-db.ts
 * NOTA: No confundir con ExaControlDB (src/shared/lib/db/indexedDB.ts) que
 *       es la DB del módulo de gestión de exámenes (admin).
 */

export const SULLU_DB_NAME = 'sullu_offline_db';
export const SULLU_DB_VERSION = 2;

export const SULLU_STORES = {
  INGRESOS_COLA:      'ingresos_cola',
  INCIDENCIAS_COLA:   'incidencias_cola',
  EXAMENES_ASIGNADOS: 'examenes_asignados_cache',
  INGRESOS_VISTA:     'ingresos_vista_cache',
  INCIDENCIAS_VISTA:  'incidencias_vista_cache',
} as const;

export type SulluStoreName = (typeof SULLU_STORES)[keyof typeof SULLU_STORES];

/**
 * Abre (y migra si es necesario) la base de datos sullu_offline_db.
 * Idempotente: múltiples llamadas comparten la misma promesa de conexión.
 */
export function openSulluDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no disponible en este entorno'));
    }

    const request = window.indexedDB.open(SULLU_DB_NAME, SULLU_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // --- v1: ingresos_cola (puede ya existir si venía del service anterior) ---
      if (!db.objectStoreNames.contains(SULLU_STORES.INGRESOS_COLA)) {
        const s = db.createObjectStore(SULLU_STORES.INGRESOS_COLA, {
          keyPath: 'clienteSyncId',
        });
        s.createIndex('examenId',    'examenId',    { unique: false });
        s.createIndex('sincronizado', 'sincronizado', { unique: false });
      }

      // --- v2: stores nuevos ---
      if (oldVersion < 2) {
        // Cola de incidencias offline (escritura → sync posterior)
        if (!db.objectStoreNames.contains(SULLU_STORES.INCIDENCIAS_COLA)) {
          const s = db.createObjectStore(SULLU_STORES.INCIDENCIAS_COLA, {
            keyPath: 'clienteSyncId',
          });
          s.createIndex('examenId',    'examenId',    { unique: false });
          s.createIndex('sincronizado', 'sincronizado', { unique: false });
        }

        // Cache de exámenes asignados al operador (control-ingreso)
        if (!db.objectStoreNames.contains(SULLU_STORES.EXAMENES_ASIGNADOS)) {
          const s = db.createObjectStore(SULLU_STORES.EXAMENES_ASIGNADOS, {
            keyPath: 'id',
          });
          s.createIndex('estado', 'estado', { unique: false });
        }

        // Cache de ingresos por examen (solo lectura — registro-ingresos)
        // keyPath: examenId — se guarda como { examenId, cachedAt, data: IngresosExamen }
        if (!db.objectStoreNames.contains(SULLU_STORES.INGRESOS_VISTA)) {
          const s = db.createObjectStore(SULLU_STORES.INGRESOS_VISTA, {
            keyPath: 'examenId',
          });
          s.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Cache de incidencias por examen (solo lectura)
        // keyPath: examenId — se guarda como { examenId, cachedAt, data: Incidencia[] }
        if (!db.objectStoreNames.contains(SULLU_STORES.INCIDENCIAS_VISTA)) {
          const s = db.createObjectStore(SULLU_STORES.INCIDENCIAS_VISTA, {
            keyPath: 'examenId',
          });
          s.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(request.error);
  });
}

/** Obtiene todos los registros de un store */
export async function idbGetAll<T>(storeName: SulluStoreName): Promise<T[]> {
  const db = await openSulluDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req   = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror   = () => resolve([]);
  });
}

/** Obtiene un registro por clave primaria */
export async function idbGet<T>(
  storeName: SulluStoreName,
  key: IDBValidKey,
): Promise<T | undefined> {
  const db = await openSulluDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req   = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => resolve(undefined);
  });
}

/** Guarda o actualiza un registro */
export async function idbPut(
  storeName: SulluStoreName,
  value: unknown,
): Promise<void> {
  const db = await openSulluDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req   = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Elimina un registro por clave primaria */
export async function idbDelete(
  storeName: SulluStoreName,
  key: IDBValidKey,
): Promise<void> {
  const db = await openSulluDB();
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => resolve();
  });
}

/** Elimina todos los registros de un store */
export async function idbClear(storeName: SulluStoreName): Promise<void> {
  const db = await openSulluDB();
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = () => resolve();
  });
}
