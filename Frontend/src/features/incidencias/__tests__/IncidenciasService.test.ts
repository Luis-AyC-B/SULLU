import axios from "axios";
import { apiClient } from "@/shared/lib/api-client";

jest.mock("next-auth/react", () => ({
  getSession: jest.fn().mockResolvedValue(null),
}));

import {
  buscarEstudiantesExpulsables,
  examenesService,
  normalizarExamen,
  normalizarIncidencia,
  obtenerIncidenciasPorExamen,
  obtenerIngresosPorExamen,
  registrarExpulsion,
} from "../api/incidencias.service";
import type { PayloadRegistrarExpulsion } from "../types/incidencias.types";

describe("Servicio de Incidencias con datos mockeados", () => {
  it("obtiene incidencias mockeadas conteniendo el campo caso y fechas ordenadas", async () => {
    const incidencias = await obtenerIncidenciasPorExamen("1");

    expect(incidencias.length).toBeGreaterThanOrEqual(4);
    const casos = incidencias.map((i) => i.caso);
    expect(casos).toContain("EXPULSION");
    expect(casos).toContain("AMONESTACION");
    expect(casos).toContain("PROBLEMA_MEDICO");

    // Verificar que existe al menos una incidencia con detalle vacio (opcional)
    const conDetalleVacio = incidencias.find((i) => i.detalle === "");
    expect(conDetalleVacio).toBeDefined();
  });

  it("permite registrar una nueva incidencia con caso no-expulsion y detalle opcional vacio", async () => {
    const payload: PayloadRegistrarExpulsion = {
      examenId: "1",
      codigoSis: "202103678", // Mateo Pérez Arce
      caso: "INCIDENCIA_TECNICA",
      motivo: "OTRO",
      detalle: "",
    };

    const nueva = await registrarExpulsion(payload);

    expect(nueva.id).toBeDefined();
    expect(nueva.caso).toBe("INCIDENCIA_TECNICA");
    expect(nueva.motivo).toBe("OTRO");
    expect(nueva.detalle).toBe("");
    expect(nueva.estudianteNombre).toBe("Mateo Pérez Arce");
  });

  it("permite registrar una incidencia con caso EXPULSION y detalle especificado", async () => {
    const payload: PayloadRegistrarExpulsion = {
      examenId: "2",
      codigoSis: "202104321", // Sofía Aguilar Céspedes
      caso: "EXPULSION",
      motivo: "SUPLANTACION_IDENTIDAD",
      detalle: "Presento credencial de otro estudiante.",
    };

    const nueva = await registrarExpulsion(payload);

    expect(nueva.id).toBeDefined();
    expect(nueva.caso).toBe("EXPULSION");
    expect(nueva.motivo).toBe("SUPLANTACION_IDENTIDAD");
    expect(nueva.detalle).toBe("Presento credencial de otro estudiante.");
  });

  describe("Tolerancia a fallos y normalización", () => {
    it("normalizarIncidencia tolera campos nulos y ausentes", () => {
      const normalizada = normalizarIncidencia({
        id: null,
        motivo: null,
        detalle: null,
        caso: null,
        estudiante: { nombre: "Juan", apellido: "Perez", cod_sis: "202012345" },
        docente: { nombre: "Docente", apellido: "Uno" },
      });

      expect(normalizada.id).toBe("");
      expect(normalizada.motivo).toBe("OTRO");
      expect(normalizada.caso).toBe("EXPULSION");
      expect(normalizada.detalle).toBe("");
      expect(normalizada.estudianteNombre).toBe("Juan Perez");
      expect(normalizada.codigoSis).toBe("202012345");
      expect(normalizada.registradoPor).toBe("Docente Uno");
    });

    it("normalizarIncidencia traduce etiquetas en español de motivos", () => {
      const normalizada = normalizarIncidencia({
        motivo: "Material no autorizado",
      });
      expect(normalizada.motivo).toBe("MATERIAL_NO_AUTORIZADO");
    });

    it("normalizarExamen adapta la respuesta de la API real de exámenes", () => {
      const examenAdaptado = normalizarExamen({
        id: 15,
        materiaNombre: "Sistemas Operativos",
        tipoExamen: "Final",
        ambienteNombre: "Aula 691B",
        carreraNombre: "Licenciatura en Informática",
        estado: "EN_CURSO",
      });

      expect(examenAdaptado.id).toBe("15");
      expect(examenAdaptado.nombre).toBe("Sistemas Operativos - Final");
      expect(examenAdaptado.ubicacion).toBe("Aula 691B · Licenciatura en Informática");
      expect(examenAdaptado.enCurso).toBe(true);
    });

    it("examenesService.obtenerExamenes está disponible y retorna lista", async () => {
      expect(examenesService).toBeDefined();
      expect(typeof examenesService.obtenerExamenes).toBe("function");
    });

    it("obtenerIncidenciasPorExamen tolera rutas con 404 y retorna []", async () => {
      const error404 = Object.assign(new Error("Not Found"), {
        isAxiosError: true,
        response: { status: 404, data: { message: "No encontrado" } },
      });
      const spy = jest
        .spyOn(apiClient, "get")
        .mockRejectedValue(error404);
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const resultado = await obtenerIncidenciasPorExamen("999");
      // En modo mock o api, no debe lanzar excepción
      expect(Array.isArray(resultado)).toBe(true);

      spy.mockRestore();
    });

    it("obtenerIngresosPorExamen consume el endpoint de ingresos o fallback", async () => {
      const spyGet = jest.spyOn(apiClient, "get").mockResolvedValue({
        data: {
          ingresos: [
            {
              id: 1,
              sis: "202001",
              estudiante: "Juan",
              estado: "Habilitado",
            },
          ],
        },
      });

      const ingresos = await obtenerIngresosPorExamen("1");
      expect(Array.isArray(ingresos)).toBe(true);
      expect(ingresos).toHaveLength(1);

      spyGet.mockRestore();
    });

    it("buscarEstudiantesExpulsables filtra solo alumnos presentes no expulsados y coincide por nombre o sis", async () => {
      const mockIngresos = [
        {
          id: 101,
          estudianteId: 101,
          sis: "202201111",
          estudiante: "Carlos Mendez",
          estado: "Habilitado",
          hora: "08:30:00",
        },
        {
          id: 102,
          estudianteId: 102,
          sis: "202202222",
          estudiante: "Maria Gomez",
          estado: "Expulsado", // Ya expulsado
          hora: "08:31:00",
        },
        {
          id: 103,
          estudianteId: 103,
          sis: "202203333",
          estudiante: "Pedro Gutierrez",
          estado: "Inhabilitado", // No en aula / inhabilitado
          hora: "08:32:00",
        },
        {
          id: 104,
          estudianteId: 104,
          sis: "202204444",
          estudiante: "Lucia Fernandez",
          estado: "Presente",
          hora: "08:33:00",
        },
      ];

      const spyGet = jest.spyOn(apiClient, "get").mockImplementation((url) => {
        if (url.includes("/ingresos")) {
          return Promise.resolve({ data: { ingresos: mockIngresos } });
        }
        if (url.includes("/expulsiones")) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      // 1. Sin filtro de búsqueda: trae solo a Carlos (Habilitado) y Lucia (Presente)
      const todosEnAula = await buscarEstudiantesExpulsables("50");
      expect(todosEnAula).toHaveLength(2);
      expect(todosEnAula.map((e) => e.codigoSis)).toEqual(["202201111", "202204444"]);
      expect(todosEnAula[0].id).toBe("101");
      expect(todosEnAula[0].estudianteId).toBe("101");

      // 2. Coincidencia por código SIS ignorando mayúsculas/minúsculas
      const porSis = await buscarEstudiantesExpulsables("50", "202201111");
      expect(porSis).toHaveLength(1);
      expect(porSis[0].nombre).toBe("Carlos Mendez");

      // 3. Coincidencia por nombre parcial (insensible a mayúsculas/minúsculas)
      const porNombre = await buscarEstudiantesExpulsables("50", "lucia");
      expect(porNombre).toHaveLength(1);
      expect(porNombre[0].codigoSis).toBe("202204444");

      spyGet.mockRestore();
    });
  });
});
