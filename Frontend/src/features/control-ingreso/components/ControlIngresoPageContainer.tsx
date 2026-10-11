"use client";

import { useActiveExam } from "../store/useActiveExamStore";
import { SeleccionExamenView } from "./seleccion/SeleccionExamenView";
import { ExamenActivoView } from "./activo/ExamenActivoView";

export function ControlIngresoPageContainer() {
  const { examenActivo } = useActiveExam();

  if (!examenActivo) {
    return <SeleccionExamenView />;
  }

  return <ExamenActivoView examen={examenActivo} />;
}
