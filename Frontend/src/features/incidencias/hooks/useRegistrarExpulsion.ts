"use client";

import { useCallback, useState } from "react";
import {
  ErrorServicioIncidencias,
  registrarExpulsion,
} from "../api/incidencias.service";
import type {
  Incidencia,
  PayloadRegistrarExpulsion,
} from "../types/incidencias.types";

export type ResultadoRegistro =
  | { ok: true; incidencia: Incidencia }
  | { ok: false; error: ErrorServicioIncidencias };

export function useRegistrarExpulsion() {
  const [enviando, setEnviando] = useState(false);

  const registrar = useCallback(
    async (payload: PayloadRegistrarExpulsion): Promise<ResultadoRegistro> => {
      setEnviando(true);
      try {
        const incidencia = await registrarExpulsion(payload);
        return { ok: true, incidencia };
      } catch (e) {
        const error =
          e instanceof ErrorServicioIncidencias
            ? e
            : new ErrorServicioIncidencias("DESCONOCIDO");
        return { ok: false, error };
      } finally {
        setEnviando(false);
      }
    },
    [],
  );

  return { registrar, enviando };
}