"use client";

import { useCallback, useState } from "react";
import {
  crearIncidencia,
  IncidenciaServiceError,
} from "../api/incidencias.service";
import type {
  CrearIncidenciaPayload,
  Incidencia,
} from "../types/incidencias.types";

export type ResultadoRegistro =
  | { ok: true; incidencia: Incidencia }
  | { ok: false; error: IncidenciaServiceError };

// No lanza excepciones: devuelve el resultado para que el modal decida qué
// mostrar según error.code (SIS_NO_EXISTE, SIN_CONEXION, etc.).
export function useRegistrarIncidencia() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrar = useCallback(
    async (payload: CrearIncidenciaPayload): Promise<ResultadoRegistro> => {
      setIsSubmitting(true);
      try {
        const incidencia = await crearIncidencia(payload);
        return { ok: true, incidencia };
      } catch (e: unknown) {
        const error =
          e instanceof IncidenciaServiceError
            ? e
            : new IncidenciaServiceError("DESCONOCIDO");
        return { ok: false, error };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { registrar, isSubmitting };
}