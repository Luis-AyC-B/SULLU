import React from "react";
import { render, screen } from "@testing-library/react";
import { InsigniaCasoIncidencia } from "../components/InsigniaCasoIncidencia";
import { CASOS_INCIDENCIA, ETIQUETA_CASO_INCIDENCIA } from "../types/incidencias.types";

describe("InsigniaCasoIncidencia", () => {
  it.each(CASOS_INCIDENCIA)("renderiza correctamente la etiqueta para el caso %s", (caso) => {
    render(<InsigniaCasoIncidencia caso={caso} />);
    expect(screen.getByText(ETIQUETA_CASO_INCIDENCIA[caso])).toBeInTheDocument();
  });
});
