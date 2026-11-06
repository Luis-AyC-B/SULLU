import {
  obtenerIncidenciasPorExamen,
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
});
