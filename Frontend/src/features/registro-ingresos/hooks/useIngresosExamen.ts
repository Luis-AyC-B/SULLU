// src/features/registro-ingresos/hooks/useIngresosExamen.ts
"use client";

import { useEffect, useState } from "react";
import { getIngresosExamen } from "../api/ingresos.service";
import type { EstadoConexion, IngresosExamen } from "../types/ingresos.types";

const INTERVALO_MS = 5000;
const FALLOS_PARA_DESCONECTAR = 3;

/**
 * Tiempo real por polling. Si fallan 3 consultas seguidas, el estado pasa a
 * "desconectado", pero se sigue reintentando y los datos ya cargados se
 * mantienen visibles. Si una consulta vuelve a funcionar, se reconecta.
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

    // Al cambiar de examen se descartan los datos del anterior
    setData(null);
    setConexion("conectado");

    const cargar = async () => {
      try {
        const resultado = await getIngresosExamen(examenId);
        if (cancelled) return;
        fallos = 0;
        setData(resultado);
        setConexion("conectado");
      } catch {
        if (cancelled) return;
        fallos += 1;
        if (fallos >= FALLOS_PARA_DESCONECTAR) setConexion("desconectado");
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