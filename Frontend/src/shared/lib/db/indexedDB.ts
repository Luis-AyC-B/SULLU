/**
 * Servicio IndexedDB para almacenamiento y persistencia local offline (HU-03)
 * Sistema: ExaControl
 */

import { Exam, MateriaOption, AmbienteOption } from "@/features/examenes/types/exam.types";

const DB_NAME = "ExaControlDB";
const DB_VERSION = 1;

export const STORES = {
  EXAMS: "exams",
  MATERIAS: "materias",
  AMBIENTES: "ambientes",
} as const;

class IndexedDBService {
  private db: IDBDatabase | null = null;

  /**
   * Inicializa la conexión con IndexedDB y crea los almacenes de objetos si no existen.
   */
  async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (typeof window === "undefined" || !window.indexedDB) {
      return Promise.reject(new Error("IndexedDB no está disponible en este entorno"));
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Almacén para exámenes
        if (!db.objectStoreNames.contains(STORES.EXAMS)) {
          const examStore = db.createObjectStore(STORES.EXAMS, { keyPath: "id" });
          examStore.createIndex("materiaId", "materiaId", { unique: false });
          examStore.createIndex("fecha", "fecha", { unique: false });
          examStore.createIndex("estado", "estado", { unique: false });
        }

        // Almacén para materias (catálogo offline)
        if (!db.objectStoreNames.contains(STORES.MATERIAS)) {
          db.createObjectStore(STORES.MATERIAS, { keyPath: "id" });
        }

        // Almacén para ambientes disponibles
        if (!db.objectStoreNames.contains(STORES.AMBIENTES)) {
          db.createObjectStore(STORES.AMBIENTES, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Obtiene todos los exámenes guardados en IndexedDB.
   */
  async getAllExams(): Promise<Exam[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EXAMS, "readonly");
      const store = tx.objectStore(STORES.EXAMS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda o actualiza un examen en IndexedDB.
   */
  async saveExam(exam: Exam): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EXAMS, "readwrite");
      const store = tx.objectStore(STORES.EXAMS);
      const request = store.put(exam);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda una lista completa de exámenes (sembrado o sincronización).
   */
  async saveAllExams(exams: Exam[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EXAMS, "readwrite");
      const store = tx.objectStore(STORES.EXAMS);

      exams.forEach((exam) => store.put(exam));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Elimina físicamente un examen de IndexedDB.
   */
  async deleteExam(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EXAMS, "readwrite");
      const store = tx.objectStore(STORES.EXAMS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new IndexedDBService();
