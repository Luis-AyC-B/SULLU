"use client";

import { useActiveExam } from "../store/useActiveExamStore";
import { SeleccionExamenView } from "./seleccion/SeleccionExamenView";

export function ControlIngresoPageContainer() {
  const { examenActivo } = useActiveExam();

  if (!examenActivo) {
    return <SeleccionExamenView />;
  }

  // Si hay examen activo, en el commit 3 renderizaremos ExamenActivoView
  return (
    <div>
      <p>Examen activo: {examenActivo.asignatura}</p>
    </div>
  );
}
