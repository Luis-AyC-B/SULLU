"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/features/registro-ingresos/hooks/useDebouncedValue";
import { buscarEstudiantesExpulsables } from "../api/incidencias.service";
import { coincideBusqueda } from "../lib/filtrarIncidencias";
import type { EstudianteExpulsable } from "../types/incidencias.types";

export function useEstudiantesExpulsables(
  examenId: string,
  consulta: string,
  activo: boolean,
) {
  const consultaDiferida = useDebouncedValue(consulta, 200);
  const [estudiantesAula, setEstudiantesAula] = useState<EstudianteExpulsable[]>([]);
  const [resultados, setResultados] = useState<EstudianteExpulsable[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    console.log(
      "[useEstudiantesExpulsables] Evaluando hook. activo:",
      activo,
      "examenId:",
      examenId,
      "tipo:",
      typeof examenId,
    );
    if (!activo || !examenId || examenId === "undefined" || examenId === "null") {
      setEstudiantesAula([]);
      setResultados([]);
      return;
    }

    let cancelado = false;
    setCargando(true);

    console.log(
      "[useEstudiantesExpulsables] Invocando buscarEstudiantesExpulsables para examenId:",
      examenId,
    );
    buscarEstudiantesExpulsables(String(examenId), "")
      .then((datos) => {
        if (!cancelado) {
          console.log(
            "[useEstudiantesExpulsables] Estudiantes recibidos del servicio:",
            datos,
          );
          setEstudiantesAula(datos);
        }
      })
      .catch((err) => {
        console.error(
          "[useEstudiantesExpulsables] Error obteniendo estudiantes:",
          err,
        );
        if (!cancelado) {
          setEstudiantesAula([]);
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [examenId, activo]);

  useEffect(() => {
    const q = consultaDiferida.trim();
    if (!q) {
      setResultados(estudiantesAula);
    } else {
      const filtrados = estudiantesAula.filter((e) =>
        coincideBusqueda(e.nombre, e.codigoSis, q),
      );
      console.log(
        "[useEstudiantesExpulsables] Filtrando por:",
        q,
        "Total en aula:",
        estudiantesAula.length,
        "Filtrados:",
        filtrados,
      );
      setResultados(filtrados);
    }
  }, [estudiantesAula, consultaDiferida]);

  return { resultados, cargando, totalEnAula: estudiantesAula.length };
}
