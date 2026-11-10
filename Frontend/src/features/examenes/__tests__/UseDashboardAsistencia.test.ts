import { renderHook, act } from "@testing-library/react";
import { useDashboardAsistencia } from "../hooks/useDashboardAsistencia";
import * as asistenciaApi from "../api/asistencia.api";
import { DashboardAsistencia } from "../types/exam.types";

jest.mock("../api/asistencia.api");

const mockDataEnCurso: DashboardAsistencia = {
  examenId: 1,
  materia: "Sistemas Operativos",
  tipoExamen: "Segundo parcial",
  carrera: "Ingeniería de Sistemas",
  ambiente: "Aula B-201 (FCyT)",
  fecha: "2026-10-28",
  horario: "11:15 - 12:45",
  docente: "Vladimir Costas Cuba",
  estado: "EN_CURSO",
  habilitados: 10,
  presentes: 7,
  ausentes: 3,
  porcentajePresentes: 70,
  porcentajeAusentes: 30,
  examenAunNoInicia: false,
  ultimaActualizacion: "2026-10-30T15:30:00.000Z",
};

describe("useDashboardAsistencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("carga inicialmente los datos de asistencia con éxito", async () => {
    (asistenciaApi.getDashboardAsistencia as jest.Mock).mockResolvedValueOnce(mockDataEnCurso);

    const { result, unmount } = renderHook(() => useDashboardAsistencia("1"));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockDataEnCurso);
    expect(result.current.error).toBeNull();
    expect(result.current.isForbidden).toBe(false);
    unmount();
  });

  it("maneja error 403 Forbidden para usuarios no autorizados", async () => {
    const error403 = {
      isAxiosError: true,
      response: { status: 403, data: { message: "Forbidden" } },
    };
    (asistenciaApi.getDashboardAsistencia as jest.Mock).mockRejectedValueOnce(error403);

    const { result, unmount } = renderHook(() => useDashboardAsistencia("1"));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isForbidden).toBe(true);
    expect(result.current.error).toContain("No tienes permiso");
    unmount();
  });

  it("maneja error 404 para examen no localizado", async () => {
    const error404 = {
      isAxiosError: true,
      response: { status: 404, data: { message: "Not Found" } },
    };
    (asistenciaApi.getDashboardAsistencia as jest.Mock).mockRejectedValueOnce(error404);

    const { result, unmount } = renderHook(() => useDashboardAsistencia("999"));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isNotFound).toBe(true);
    unmount();
  });

  it("conserva los datos previos cuando ocurre un fallo de red al refrescar", async () => {
    (asistenciaApi.getDashboardAsistencia as jest.Mock)
      .mockResolvedValueOnce(mockDataEnCurso)
      .mockRejectedValueOnce(new Error("Network Error"));

    const { result, unmount } = renderHook(() => useDashboardAsistencia("1"));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.data).toEqual(mockDataEnCurso);

    // Ejecutar refresco manual que falla
    await act(async () => {
      result.current.refrescar();
    });

    // Se conserva la información previa y se muestra el error (Criterio 6)
    expect(result.current.data).toEqual(mockDataEnCurso);
    expect(result.current.error).not.toBeNull();
    unmount();
  });

  it("realiza polling periódico si el examen está en curso", async () => {
    (asistenciaApi.getDashboardAsistencia as jest.Mock)
      .mockResolvedValueOnce(mockDataEnCurso)
      .mockResolvedValueOnce({
        ...mockDataEnCurso,
        presentes: 8,
        ausentes: 2,
        porcentajePresentes: 80,
        porcentajeAusentes: 20,
      });

    const { result, unmount } = renderHook(() =>
      useDashboardAsistencia("1", { pollingIntervalMs: 5000 })
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.data?.presentes).toBe(7);

    // Avanzar tiempo del polling
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.data?.presentes).toBe(8);
    unmount();
  });
});
