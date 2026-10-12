"use client";

import { useState, useCallback } from "react";
import type {
  ExamenAsignado,
  EstudianteBusquedaItem,
  TipoExcepcionIngreso,
} from "../types/control-ingreso.types";
import { controlIngresoService } from "../services/control-ingreso.service";

export type PasoRegistroManual =
  | "BUSQUEDA"
  | "CONFIRMAR"
  | "EXCEPCION"
  | "EXITO";

export interface ExcepcionDetalle {
  tipo: TipoExcepcionIngreso;
  titulo: string;
  mensaje: string;
  estudiante: EstudianteBusquedaItem;
}

export function useRegistroManual(examen: ExamenAsignado, onIngresoExitoso?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [paso, setPaso] = useState<PasoRegistroManual>("BUSQUEDA");
  const [queryActual, setQueryActual] = useState("");
  const [resultados, setResultados] = useState<EstudianteBusquedaItem[]>([]);
  const [isLoadingBusqueda, setIsLoadingBusqueda] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const [estudianteSeleccionado, setEstudianteSeleccionado] =
    useState<EstudianteBusquedaItem | null>(null);
  const [excepcion, setExcepcion] = useState<ExcepcionDetalle | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const openModal = useCallback(() => {
    setIsOpen(true);
    setPaso("BUSQUEDA");
    setQueryActual("");
    setResultados([]);
    setBusquedaRealizada(false);
    setEstudianteSeleccionado(null);
    setExcepcion(null);
    setErrorEnvio(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setPaso("BUSQUEDA");
    setEstudianteSeleccionado(null);
    setExcepcion(null);
    setErrorEnvio(null);
  }, []);

  const handleBuscar = useCallback(
    async (query: string) => {
      setIsLoadingBusqueda(true);
      setQueryActual(query);
      try {
        const data = await controlIngresoService.buscarEstudiantes(
          examen.id,
          query
        );
        setResultados(data);
        setBusquedaRealizada(true);
      } catch {
        setResultados([]);
        setBusquedaRealizada(true);
      } finally {
        setIsLoadingBusqueda(false);
      }
    },
    [examen.id]
  );

  /**
   * Validación del estudiante seleccionado según las reglas de HU9:
   * 1. Ya registrado (doble marcación)
   * 2. No habilitado
   * 3. Ambiente incorrecto
   */
  const handleSeleccionarEstudiante = useCallback(
    (estudiante: EstudianteBusquedaItem) => {
      setEstudianteSeleccionado(estudiante);
      setErrorEnvio(null);

      // Regla HU9.1: Ya registrado
      if (estudiante.yaIngreso) {
        setExcepcion({
          tipo: "YA_REGISTRADO",
          titulo: "Estudiante ya registrado",
          mensaje: `Este estudiante ya registró su ingreso a este examen a las ${
            estudiante.horaIngresoPrevio || "previa marcación"
          } mediante ${estudiante.metodoIngresoPrevio || "sistema"}.`,
          estudiante,
        });
        setPaso("EXCEPCION");
        return;
      }

      // Regla HU9.2: No habilitado
      if (!estudiante.estadoHabilitado) {
        setExcepcion({
          tipo: "NO_HABILITADO",
          titulo: "Estudiante no habilitado",
          mensaje:
            estudiante.motivoInhabilitacion ||
            "El estudiante figura inhabilitado para rendir este examen.",
          estudiante,
        });
        setPaso("EXCEPCION");
        return;
      }

      // Regla HU9.3: Ambiente incorrecto
      if (
        estudiante.ambienteAsignado &&
        examen.ambiente &&
        estudiante.ambienteAsignado.toLowerCase() !==
          examen.ambiente.toLowerCase()
      ) {
        setExcepcion({
          tipo: "AMBIENTE_INCORRECTO",
          titulo: "Ambiente incorrecto",
          mensaje: `El estudiante tiene asignado el ambiente "${estudiante.ambienteAsignado}", pero el examen actual se rinde en "${examen.ambiente}".`,
          estudiante,
        });
        setPaso("EXCEPCION");
        return;
      }

      // Si pasa todas las validaciones -> pantalla de confirmación
      setExcepcion(null);
      setPaso("CONFIRMAR");
    },
    [examen.ambiente]
  );

  const handleVolverAResultados = useCallback(() => {
    setPaso("BUSQUEDA");
    setExcepcion(null);
    setErrorEnvio(null);
  }, []);

  const handleConfirmarIngreso = useCallback(async () => {
    if (!estudianteSeleccionado || isSubmitting) return;

    setIsSubmitting(true);
    setErrorEnvio(null);

    try {
      const syncId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sync-${Date.now()}`;

      await controlIngresoService.registrarIngresoManual(examen.id, {
        estudianteId: estudianteSeleccionado.id,
        clienteSyncId: syncId,
      });

      // Actualizar el estado local del estudiante como ingresado
      setResultados((prev) =>
        prev.map((e) =>
          e.id === estudianteSeleccionado.id ? { ...e, yaIngreso: true } : e
        )
      );

      setPaso("EXITO");
      if (onIngresoExitoso) {
        onIngresoExitoso();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al registrar el ingreso. Intenta nuevamente.";
      setErrorEnvio(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [estudianteSeleccionado, isSubmitting, examen.id, onIngresoExitoso]);

  return {
    isOpen,
    paso,
    queryActual,
    resultados,
    isLoadingBusqueda,
    busquedaRealizada,
    estudianteSeleccionado,
    excepcion,
    isSubmitting,
    errorEnvio,
    openModal,
    closeModal,
    handleBuscar,
    handleSeleccionarEstudiante,
    handleVolverAResultados,
    handleConfirmarIngreso,
  };
}
