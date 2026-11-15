import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModalConfirmarExpulsion } from "../components/ModalConfirmarExpulsion";
import type { ValoresFormularioExpulsion } from "../types/incidencias.types";

describe("ModalConfirmarExpulsion", () => {
  const valoresExpulsion: ValoresFormularioExpulsion = {
    estudiante: {
      codigoSis: "202001456",
      nombre: "Diego Flores Vargas",
    },
    caso: "EXPULSION",
    motivo: "MATERIAL_NO_AUTORIZADO",
    detalle: "Apuntes debajo del pupitre",
  };

  const valoresAmonestacionSinDetalle: ValoresFormularioExpulsion = {
    estudiante: {
      codigoSis: "201902345",
      nombre: "Valeria Lopez Quispe",
    },
    caso: "AMONESTACION",
    motivo: "USO_CELULAR",
    detalle: "",
  };

  it("renderiza titulo y advertencia de expulsion cuando el caso es EXPULSION", () => {
    const onConfirmar = jest.fn();
    render(
      <ModalConfirmarExpulsion
        abierto={true}
        onAbiertoChange={jest.fn()}
        examenNombre="Bases de Datos II"
        valores={valoresExpulsion}
        enviando={false}
        error={null}
        onConfirmar={onConfirmar}
      />,
    );

    expect(
      screen.getByText("¿Expulsar a Diego Flores Vargas del examen?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Expulsión")).toBeInTheDocument();
    expect(screen.getByText("Material no autorizado")).toBeInTheDocument();
    expect(
      screen.getByText(/El estudiante no podrá reingresar a este examen/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar expulsión" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar expulsión" }),
    );
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it("renderiza titulo correspondiente y mensaje de sin detalle cuando el caso es otro y no tiene detalle", () => {
    render(
      <ModalConfirmarExpulsion
        abierto={true}
        onAbiertoChange={jest.fn()}
        examenNombre="Bases de Datos II"
        valores={valoresAmonestacionSinDetalle}
        enviando={false}
        error={null}
        onConfirmar={jest.fn()}
      />,
    );

    expect(
      screen.getByText("¿Registrar amonestación verbal para Valeria Lopez Quispe?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Amonestación verbal")).toBeInTheDocument();
    expect(screen.getByText("Uso de celular")).toBeInTheDocument();
    expect(
      screen.getByText("Sin observaciones en el detalle."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar" }),
    ).toBeInTheDocument();
  });

  it("renderiza titulo de falta grave y advertencia cuando el caso es SUPLANTACION_IDENTIDAD", () => {
    const valoresSuplantacion: ValoresFormularioExpulsion = {
      estudiante: {
        codigoSis: "201900123",
        nombre: "Ana Rojas Mamani",
      },
      caso: "SUPLANTACION_IDENTIDAD",
      motivo: "SUPLANTACION_IDENTIDAD",
      detalle: "Presento credencial de otra persona",
    };

    render(
      <ModalConfirmarExpulsion
        abierto={true}
        onAbiertoChange={jest.fn()}
        examenNombre="Bases de Datos II"
        valores={valoresSuplantacion}
        enviando={false}
        error={null}
        onConfirmar={jest.fn()}
      />,
    );

    expect(
      screen.getByText("¿Registrar suplantación de identidad para Ana Rojas Mamani?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El estudiante quedará inhabilitado de inmediato/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar suplantación" }),
    ).toBeInTheDocument();
  });
});
