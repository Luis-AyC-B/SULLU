import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamCard } from "../components/ExamCard";
import { Exam } from "../types/exam.types";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const baseExam: Exam = {
  id: "1",
  materiaId: "101",
  materiaNombre: "Sistemas Operativos",
  carreraId: "1",
  carreraNombre: "Ingeniería de Sistemas",
  facultadId: "1",
  facultadNombre: "FCyT",
  tipoExamen: "Segundo parcial",
  ambienteId: "201",
  ambienteNombre: "Aula B-201 (FCyT)",
  fecha: "2026-10-28",
  horaInicio: "11:15",
  horaFin: "12:45",
  duracionMinutos: 90,
  habilitadosCount: 10,
  presentesCount: 7,
  ausentesCount: 3,
  docenteId: "2",
  docenteNombre: "Vladimir Costas Cuba",
  estado: "En curso",
  createdAt: "2026-10-28T08:00:00Z",
};

describe("ExamCard (Métricas de Asistencia HU16)", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("muestra los contadores de Habilitados, Presentes y Ausentes para un examen en curso", () => {
    render(<ExamCard exam={baseExam} />);

    expect(screen.getByText("Habilitados")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    expect(screen.getByText("Presentes")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();

    expect(screen.getByText("Ausentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("muestra un guion '—' en Ausentes cuando el examen está Programado (aún no inicia)", () => {
    const examProgramado: Exam = {
      ...baseExam,
      estado: "Programado",
      ausentesCount: null,
    };

    render(<ExamCard exam={examProgramado} />);

    expect(screen.getByText("Ausentes")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("al hacer click en la tarjeta navega a /examenes/:id/asistencia", () => {
    render(<ExamCard exam={baseExam} />);

    const card = screen.getByRole("article");
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith("/examenes/1/asistencia");
  });

  it("al hacer click en editar no navega al dashboard de asistencia", () => {
    const handleEdit = jest.fn();
    render(<ExamCard exam={baseExam} onEdit={handleEdit} canEdit={true} />);

    const editBtn = screen.getByTitle("Editar examen");
    fireEvent.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
