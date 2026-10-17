"use client";

import { useSyncExternalStore } from "react";
import type { ExamenAsignado } from "../types/control-ingreso.types";

const STORAGE_KEY = "exacontrol_active_exam";

let currentExam: ExamenAsignado | null = null;
const listeners = new Set<() => void>();

function initStore() {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      currentExam = JSON.parse(raw);
    }
  } catch {
    currentExam = null;
  }
}

if (typeof window !== "undefined") {
  initStore();
}

function notify() {
  listeners.forEach((listener) => listener());
}

export const activeExamStore = {
  getExamenActivo(): ExamenAsignado | null {
    return currentExam;
  },

  setExamenActivo(examen: ExamenAsignado) {
    currentExam = examen;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(examen));
      } catch (err) {
        console.error("Error saving active exam to sessionStorage:", err);
      }
    }
    notify();
  },

  clearExamenActivo() {
    currentExam = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error("Error clearing active exam from sessionStorage:", err);
      }
    }
    notify();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Hook reactivo para acceder y gestionar el examen activo.
 * Compartido entre Control de Ingreso (HU7), Registro Manual (HU8) y Escáner QR (HU9).
 */
export function useActiveExam() {
  const examenActivo = useSyncExternalStore(
    activeExamStore.subscribe,
    activeExamStore.getExamenActivo,
    () => null // Server side snapshot
  );

  return {
    examenActivo,
    setExamenActivo: activeExamStore.setExamenActivo,
    clearExamenActivo: activeExamStore.clearExamenActivo,
  };
}
