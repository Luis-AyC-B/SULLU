import {
  CASOS_INCIDENCIA,
  ETIQUETA_CASO_INCIDENCIA,
  OPCIONES_CASO_INCIDENCIA,
  aPayloadRegistrarExpulsion,
  formularioExpulsionSchema,
  incidenciaSchema,
} from "../types/incidencias.types";

describe("Modulo de Incidencias - Types y Validaciones", () => {
  const estudianteValido = {
    codigoSis: "202001456",
    nombre: "Diego Flores Vargas",
  };

  it("debe contener las opciones de caso requeridas incluyendo EXPULSION y otros casos de examen", () => {
    expect(CASOS_INCIDENCIA).toContain("EXPULSION");
    expect(CASOS_INCIDENCIA).toContain("SUPLANTACION_IDENTIDAD");
    expect(CASOS_INCIDENCIA).toContain("AMONESTACION");
    expect(CASOS_INCIDENCIA).toContain("PROBLEMA_MEDICO");
    expect(CASOS_INCIDENCIA).toContain("RETIRO_VOLUNTARIO");
    expect(CASOS_INCIDENCIA).toContain("INCIDENCIA_TECNICA");
    expect(CASOS_INCIDENCIA).toContain("OTRO");

    expect(OPCIONES_CASO_INCIDENCIA.length).toBe(CASOS_INCIDENCIA.length);
    for (const caso of CASOS_INCIDENCIA) {
      expect(ETIQUETA_CASO_INCIDENCIA[caso]).toBeDefined();
    }
  });

  describe("formularioExpulsionSchema - Detalle opcional y campo Caso", () => {
    it("debe ser VALIDO cuando el detalle esta vacio (detalle opcional)", () => {
      const datos = {
        estudiante: estudianteValido,
        caso: "EXPULSION",
        motivo: "MATERIAL_NO_AUTORIZADO",
        detalle: "",
      };

      const resultado = formularioExpulsionSchema.safeParse(datos);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.detalle).toBe("");
        expect(resultado.data.caso).toBe("EXPULSION");
      }
    });

    it("debe ser VALIDO cuando el detalle se omite o es solo espacios", () => {
      const datos = {
        estudiante: estudianteValido,
        caso: "AMONESTACION",
        motivo: "USO_CELULAR",
        detalle: "   ",
      };

      const resultado = formularioExpulsionSchema.safeParse(datos);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.detalle).toBe("");
        expect(resultado.data.caso).toBe("AMONESTACION");
      }
    });

    it("debe ser VALIDO con detalle provisto y diferentes casos de examen", () => {
      for (const caso of CASOS_INCIDENCIA) {
        const datos = {
          estudiante: estudianteValido,
          caso,
          motivo: "OTRO",
          detalle: `Observacion detallada para caso ${caso}`,
        };

        const resultado = formularioExpulsionSchema.safeParse(datos);
        expect(resultado.success).toBe(true);
        if (resultado.success) {
          expect(resultado.data.caso).toBe(caso);
          expect(resultado.data.detalle).toBe(
            `Observacion detallada para caso ${caso}`,
          );
        }
      }
    });

    it("debe fallar si no se selecciona un estudiante", () => {
      const datos = {
        caso: "EXPULSION",
        motivo: "MATERIAL_NO_AUTORIZADO",
        detalle: "Observacion",
      };

      const resultado = formularioExpulsionSchema.safeParse(datos);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const errores = resultado.error.flatten().fieldErrors;
        expect(errores.estudiante).toBeDefined();
      }
    });

    it("debe fallar si no se selecciona un caso", () => {
      const datos = {
        estudiante: estudianteValido,
        motivo: "MATERIAL_NO_AUTORIZADO",
        detalle: "",
      };

      const resultado = formularioExpulsionSchema.safeParse(datos);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const errores = resultado.error.flatten().fieldErrors;
        expect(errores.caso).toBeDefined();
      }
    });

    it("debe fallar si no se selecciona un motivo", () => {
      const datos = {
        estudiante: estudianteValido,
        caso: "EXPULSION",
        detalle: "",
      };

      const resultado = formularioExpulsionSchema.safeParse(datos);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const errores = resultado.error.flatten().fieldErrors;
        expect(errores.motivo).toBeDefined();
      }
    });

    it("debe fallar si el detalle supera el limite maximo de 500 caracteres", () => {
      const datos = {
        estudiante: estudianteValido,
        caso: "EXPULSION",
        motivo: "MATERIAL_NO_AUTORIZADO",
        detalle: "a".repeat(501),
      };

      const resultado = formularioExpulsionSchema.safeParse(datos);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        const errores = resultado.error.flatten().fieldErrors;
        expect(errores.detalle).toBeDefined();
      }
    });
  });

  describe("aPayloadRegistrarExpulsion", () => {
    it("mapea los valores del formulario incluyendo caso y detalle limpio", () => {
      const valores = {
        estudiante: estudianteValido,
        caso: "PROBLEMA_MEDICO" as const,
        motivo: "OTRO" as const,
        detalle: "   Se traslada a atencion medica   ",
      };

      const payload = aPayloadRegistrarExpulsion("examen-1", valores);
      expect(payload).toEqual({
        examenId: "examen-1",
        codigoSis: "202001456",
        caso: "PROBLEMA_MEDICO",
        motivo: "OTRO",
        detalle: "Se traslada a atencion medica",
      });
    });

    it("permite mapear con detalle vacio", () => {
      const valores = {
        estudiante: estudianteValido,
        caso: "EXPULSION" as const,
        motivo: "MATERIAL_NO_AUTORIZADO" as const,
        detalle: "",
      };

      const payload = aPayloadRegistrarExpulsion("examen-1", valores);
      expect(payload.detalle).toBe("");
    });

    it("conserva id y estudianteId cuando estan presentes en el estudiante", () => {
      const valores = {
        estudiante: {
          id: 42,
          estudianteId: 42,
          codigoSis: "202201234",
          nombre: "Juan Perez",
        },
        caso: "EXPULSION" as const,
        motivo: "USO_CELULAR" as const,
        detalle: "Usando celular",
      };

      const payload = aPayloadRegistrarExpulsion("10", valores);
      expect(payload.estudianteId).toBe(42);
      expect(payload.id).toBe(42);
      expect(payload.codigoSis).toBe("202201234");
    });
  });

  describe("incidenciaSchema", () => {
    it("asigna EXPULSION por defecto si no viene caso en datos historicos", () => {
      const datos = {
        id: "10",
        examenId: "1",
        fechaHora: "2026-10-30T10:00:00Z",
        codigoSis: "202001456",
        estudianteNombre: "Diego Flores",
        motivo: "MATERIAL_NO_AUTORIZADO",
        detalle: "",
        registradoPor: "Edgar",
      };

      const resultado = incidenciaSchema.safeParse(datos);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.caso).toBe("EXPULSION");
      }
    });

    it("tolera campos nulos o ausentes con valores por defecto seguros", () => {
      const datos = {
        id: null,
        examenId: null,
        fechaHora: null,
        codigoSis: null,
        estudianteNombre: null,
        caso: null,
        motivo: null,
        detalle: null,
        registradoPor: null,
      };

      const resultado = incidenciaSchema.safeParse(datos);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.id).toBe("");
        expect(resultado.data.caso).toBe("EXPULSION");
        expect(resultado.data.motivo).toBe("OTRO");
        expect(resultado.data.detalle).toBe("");
        expect(resultado.data.codigoSis).toBe("");
        expect(resultado.data.estudianteNombre).toBe("");
      }
    });
  });
});
