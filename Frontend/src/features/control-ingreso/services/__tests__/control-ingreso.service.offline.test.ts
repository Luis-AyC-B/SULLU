import { controlIngresoService } from "../control-ingreso.service";
import {
  getMiGrupoControlador,
  guardarMiGrupoEnCache,
} from "../../api/mi-grupo.api";
import { apiClient } from "@/shared/lib/api-client";
import type { MiGrupoControlador } from "../../types/control-ingreso.types";

jest.mock("@/shared/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("HU17 Offline: Partición de controladores y listas divididas en modo offline", () => {
  const EXAMEN_ID = 19;

  const mockGrupoFernando: MiGrupoControlador = {
    examenId: EXAMEN_ID,
    asignatura: "Bases de Datos I",
    ambiente: "Laboratorio Informática 1",
    colaboradorId: 86,
    nombreControlador: "Fernando Aguilar",
    rolAsignacion: "Controlador Fila M-V",
    nombreLista: "Lista B",
    rango: "M - V",
    letraInicio: "M",
    letraFin: "V",
    totalEstudiantesGrupo: 2,
    totalEstudiantesExamen: 4,
    estudiantes: [
      {
        id: 101,
        codSis: "202001101",
        nombre: "Carlos",
        apellido: "Mamani Quispe",
        estadoHabilitado: true,
        yaIngreso: false,
      },
      {
        id: 102,
        codSis: "202001102",
        nombre: "Roberto",
        apellido: "Villarroel Rocha",
        estadoHabilitado: true,
        yaIngreso: false,
      },
    ],
  };

  const mockNominaCompleta = [
    {
      id: 101,
      codSis: "202001101",
      ci: "1111111",
      nombre: "Carlos",
      apellido: "Mamani Quispe",
      estadoHabilitado: true,
      motivoInhabilitacion: null,
      ambienteAsignado: "Lab 1",
      yaIngreso: false,
      nombreLista: "Lista B",
      rangoAsignado: "M - V",
    },
    {
      id: 102,
      codSis: "202001102",
      ci: "2222222",
      nombre: "Roberto",
      apellido: "Villarroel Rocha",
      estadoHabilitado: true,
      motivoInhabilitacion: null,
      ambienteAsignado: "Lab 1",
      yaIngreso: false,
      nombreLista: "Lista B",
      rangoAsignado: "M - V",
    },
    // Estudiantes de la Lista A (Luciana: A - L)
    {
      id: 201,
      codSis: "202001201",
      ci: "3333333",
      nombre: "Alejandro",
      apellido: "Alvarez Castro",
      estadoHabilitado: true,
      motivoInhabilitacion: null,
      ambienteAsignado: "Lab 1",
      yaIngreso: false,
      nombreLista: "Lista A",
      rangoAsignado: "A - L",
    },
    {
      id: 202,
      codSis: "202001202",
      ci: "4444444",
      nombre: "Beatriz",
      apellido: "Fernandez Lopez",
      estadoHabilitado: false,
      motivoInhabilitacion: "Cuota pendiente",
      ambienteAsignado: "Lab 1",
      yaIngreso: false,
      nombreLista: "Lista A",
      rangoAsignado: "A - L",
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Precargar caché con nómina completa y grupo asignado a Fernando (M - V)
    localStorage.setItem(
      `sullu_nomina_estudiantes_${EXAMEN_ID}`,
      JSON.stringify(mockNominaCompleta)
    );
    guardarMiGrupoEnCache(EXAMEN_ID, mockGrupoFernando);

    // Simular navegador sin conexión
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
  });

  test("1. getMiGrupoControlador recupera la lista asignada desde caché cuando está offline", async () => {
    const grupo = await getMiGrupoControlador(EXAMEN_ID);
    expect(grupo).not.toBeNull();
    expect(grupo?.nombreControlador).toBe("Fernando Aguilar");
    expect(grupo?.rango).toBe("M - V");
    expect(grupo?.estudiantes).toHaveLength(2);
  });

  test("2. QR Offline: Estudiante de su propia fila (Carlos Mamani - M) es ACEPTADO para confirmación", async () => {
    // Generar token JWT simulado para estudiante 101 (Carlos Mamani)
    const payload = { sub: 101, codSis: "202001101", exp: Math.floor(Date.now() / 1000) + 3600 };
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const fakeToken = `header.${b64Payload}.signature`;

    const res = await controlIngresoService.validarYRegistrarQr(EXAMEN_ID, fakeToken);

    expect(res.success).toBe(true);
    expect(res.estudiante?.nombre).toBe("Carlos");
    expect(res.estudiante?.codSis).toBe("202001101");
  });

  test("3. QR Offline: Estudiante de otra fila (Alejandro Alvarez - A) es BLOQUEADO con FUERA_DE_GRUPO", async () => {
    // Token simulado para estudiante 201 (Alejandro Alvarez, de Lista A)
    const payload = { sub: 201, codSis: "202001201", exp: Math.floor(Date.now() / 1000) + 3600 };
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const fakeToken = `header.${b64Payload}.signature`;

    const res = await controlIngresoService.validarYRegistrarQr(EXAMEN_ID, fakeToken);

    expect(res.success).toBe(false);
    expect(res.excepcion).toBe("FUERA_DE_GRUPO");
    expect(res.mensaje).toContain("no pertenece a tu fila asignada");
    expect(res.mensaje).toContain("Lista B: M - V");
    expect(res.mensaje).toContain("Lista A");
  });

  test("4. Registro Manual Offline: Estudiante de su fila es guardado en cola", async () => {
    const res = await controlIngresoService.registrarIngresoManual(EXAMEN_ID, {
      identificador: "202001101",
      estudianteId: 101,
    });

    expect(res.success).toBe(true);
    expect(res.mensaje).toContain("sin conexión");
  });

  test("5. Registro Manual Offline: Estudiante de otra fila es BLOQUEADO con error FUERA_DE_GRUPO", async () => {
    await expect(
      controlIngresoService.registrarIngresoManual(EXAMEN_ID, {
        identificador: "202001201", // Alejandro Alvarez (Lista A)
        estudianteId: 201,
      })
    ).rejects.toThrow("no pertenece a tu fila asignada");
  });

  test("6. Búsqueda Offline: Incluye nombreLista y rangoAsignado en cada resultado", async () => {
    const resultados = await controlIngresoService.buscarEstudiantes(EXAMEN_ID, "Mamani");
    expect(resultados).toHaveLength(1);
    expect(resultados[0].nombreLista).toBe("Lista B");
    expect(resultados[0].rangoAsignado).toBe("M - V");
  });
});
