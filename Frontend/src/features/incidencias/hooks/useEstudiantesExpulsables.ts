"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/features/registro-ingresos/hooks/useDebouncedValue";
import { buscarEstudiantesExpulsables } from "../api/incidencias.service";
import type { EstudianteExpulsable } from "../types/incidencias.types";

export function useEstudiantesExpulsables(
  examenId: string,
  consulta: string,
  activo: boolean,
) {
  const consultaDiferida = useDebouncedValue(consulta, 250);
  const [resultados, setResultados] = useState<EstudianteExpulsable[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    setCargando(true);

    buscarEstudiantesExpulsables(examenId, consultaDiferida)
      .then((datos) => {
        if (!cancelado) setResultados(datos);
      })
      .catch(() => {
        if (!cancelado) setResultados([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [examenId, consultaDiferida, activo]);

  return { resultados, cargando };
}