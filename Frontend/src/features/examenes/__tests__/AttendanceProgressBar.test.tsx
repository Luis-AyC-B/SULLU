import React from "react";
import { render, screen } from "@testing-library/react";
import { AttendanceProgressBar } from "../components/asistencia/AttendanceProgressBar";

describe("AttendanceProgressBar", () => {
  it("renderiza correctamente el título y el conteo de presentes vs habilitados", () => {
    render(
      <AttendanceProgressBar
        presentes={7}
        habilitados={10}
        porcentajePresentes={70}
      />
    );

    expect(screen.getByText("Progreso de asistencia")).toBeInTheDocument();
    expect(screen.getByText("7 de 10 estudiantes presentes")).toBeInTheDocument();
    expect(screen.getByText("Presentes")).toBeInTheDocument();
    expect(screen.getByText("Ausentes")).toBeInTheDocument();
  });

  it("asigna aria-valuenow con el porcentaje correspondiente", () => {
    render(
      <AttendanceProgressBar
        presentes={5}
        habilitados={10}
        porcentajePresentes={50}
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");
  });

  it("maneja caso borde con 0 habilitados sin NaN ni división por cero", () => {
    render(
      <AttendanceProgressBar
        presentes={0}
        habilitados={0}
        porcentajePresentes={0}
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0 de 0 estudiantes presentes")).toBeInTheDocument();
  });
});
