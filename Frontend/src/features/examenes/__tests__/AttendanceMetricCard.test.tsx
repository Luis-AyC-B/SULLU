import React from "react";
import { render, screen } from "@testing-library/react";
import { AttendanceMetricCard } from "../components/asistencia/AttendanceMetricCard";

describe("AttendanceMetricCard", () => {
  it("renderiza métrica de habilitados con valor y porcentaje", () => {
    render(
      <AttendanceMetricCard
        variant="habilitados"
        label="Habilitados"
        value={10}
        percentage={100}
      />
    );

    expect(screen.getByText("Habilitados")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("100 %")).toBeInTheDocument();
  });

  it("renderiza métrica de presentes con color y porcentaje", () => {
    render(
      <AttendanceMetricCard
        variant="presentes"
        label="Presentes"
        value={7}
        percentage={70}
      />
    );

    expect(screen.getByText("Presentes")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("70 %")).toBeInTheDocument();
  });

  it("renderiza métrica de ausentes en un examen iniciado", () => {
    render(
      <AttendanceMetricCard
        variant="ausentes"
        label="Ausentes"
        value={3}
        percentage={30}
      />
    );

    expect(screen.getByText("Ausentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("30 %")).toBeInTheDocument();
  });

  it("oculta contador y muestra aviso 'El examen aún no inicia' cuando aún no comenzó", () => {
    render(
      <AttendanceMetricCard
        variant="ausentes"
        label="Ausentes"
        value={null}
        percentage={0}
        isNotStarted={true}
      />
    );

    expect(screen.getByText("Ausentes")).toBeInTheDocument();
    expect(screen.getByText("El examen aún no inicia")).toBeInTheDocument();
    expect(screen.queryByText("0 %")).not.toBeInTheDocument();
  });
});
