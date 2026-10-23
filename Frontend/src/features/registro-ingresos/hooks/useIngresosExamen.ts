// src/features/registro-ingresos/hooks/useIngresosExamen.ts
"use client";

import { useEffect, useState } from "react";
import { getIngresosExamen } from "../api/ingresos.service";
import type { EstadoConexion, IngresosExamen } from "../types/ingresos.types";

const INTERVALO_MS = 5000;
const FALLOS_PARA_DESCONECTAR = 3;

/**
 * Tiempo real por polling con soporte offline.
 * Si no hay red, carga inmediatamente la copia local de IndexedDB/localStorage.
 */
export function useIngresosExamen(
  examenId: string | null,
  intervaloMs: number = INTERVALO_MS,
) {
  const [data, setData] = useState<IngresosExamen | null>(null);
  const [conexion, setConexion] = useState<EstadoConexion>("conectado");

  useEffect(() => {
    if (examenId === null) return;

    let cancelled = false;
    let fallos = 0;

    setData(null);
    setConexion(typeof navigator !== "undefined" && !navigator.onLine ? "desconectado" : "conectado");

    const cargar = async () => {
      try {
        const resultado = await getIngresosExamen(examenId);
        if (cancelled) return;
        setData(resultado);

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setConexion("desconectado");
        } else {
          fallos = 0;
          setConexion("conectado");
        }
      } catch {
        if (cancelled) return;
        fallos += 1;
        if (fallos >= FALLOS_PARA_DESCONECTAR || (typeof navigator !== "undefined" && !navigator.onLine)) {
          setConexion("desconectado");
        }
      }
    };

    cargar();
    const timer = setInterval(cargar, intervaloMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [examenId, intervaloMs]);

  return { data, conexion };
}
