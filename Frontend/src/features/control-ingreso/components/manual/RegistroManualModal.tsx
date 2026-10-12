"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ExamenAsignado } from "../../types/control-ingreso.types";
import { useRegistroManual } from "../../hooks/useRegistroManual";
import { BusquedaEstudianteStep } from "./BusquedaEstudianteStep";
import { ConfirmarIngresoStep } from "./ConfirmarIngresoStep";
import { ExcepcionValidacionCard } from "./ExcepcionValidacionCard";
import { ExitoIngresoFeedback } from "./ExitoIngresoFeedback";

interface RegistroManualModalProps {
  examen: ExamenAsignado;
  isOpen: boolean;
  onClose: () => void;
  onIngresoExitoso?: () => void;
}

export function RegistroManualModal({
  examen,
  isOpen,
  onClose,
  onIngresoExitoso,
}: RegistroManualModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const controller = useRegistroManual(examen, onIngresoExitoso);

  // Sincronizar apertura desde props externas
  useEffect(() => {
    if (isOpen) {
      controller.openModal();
    } else {
      controller.closeModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTitulo = () => {
    switch (controller.paso) {
      case "CONFIRMAR":
        return "Confirmar ingreso";
      case "EXCEPCION":
        return "Validación de ingreso";
      case "EXITO":
        return "Ingreso registrado";
      default:
        return "Registrar ingreso manual";
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Contenedor: Hoja inferior en mobile (< md) / Modal centrado en desktop (>= md) */}
      <div
        ref={modalRef}
        className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-5 md:p-7 flex flex-col max-h-[92vh] md:max-h-[85vh] relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200"
      >
        {/* Barra táctil indicadora en mobile */}
        <div className="block md:hidden h-1 w-12 rounded-full bg-slate-200 mx-auto mb-3 shrink-0" />

        {/* Encabezado con Título y Botón Cerrar */}
        <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg md:text-xl font-bold text-slate-900">
            {getTitulo()}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Banner contextual del Examen Activo (Visible en Búsqueda y Confirmación) */}
        {controller.paso === "BUSQUEDA" && (
          <div className="mt-3.5 mb-4 p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200/60 shrink-0">
            <h4 className="text-sm font-bold text-[#002D62]">
              {examen.asignatura}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {examen.ambiente} · {examen.horario}
            </p>
          </div>
        )}

        {/* Cuerpo dinámico según el paso del flujo */}
        <div className="overflow-y-auto flex-1 pr-0.5 py-1">
          {controller.paso === "BUSQUEDA" && (
            <BusquedaEstudianteStep
              onBuscar={controller.handleBuscar}
              onSeleccionar={controller.handleSeleccionarEstudiante}
              resultados={controller.resultados}
              isLoading={controller.isLoadingBusqueda}
              busquedaRealizada={controller.busquedaRealizada}
              queryActual={controller.queryActual}
            />
          )}

          {controller.paso === "CONFIRMAR" && controller.estudianteSeleccionado && (
            <ConfirmarIngresoStep
              estudiante={controller.estudianteSeleccionado}
              examen={examen}
              onVolver={controller.handleVolverAResultados}
              onCancelar={onClose}
              onConfirmar={controller.handleConfirmarIngreso}
              isSubmitting={controller.isSubmitting}
              errorEnvio={controller.errorEnvio}
            />
          )}

          {controller.paso === "EXCEPCION" && controller.excepcion && (
            <ExcepcionValidacionCard
              excepcion={controller.excepcion}
              examenId={examen.id}
              onContinuar={controller.handleVolverAResultados}
              onCerrar={onClose}
            />
          )}

          {controller.paso === "EXITO" && controller.estudianteSeleccionado && (
            <ExitoIngresoFeedback
              estudiante={controller.estudianteSeleccionado}
              onContinuar={controller.handleVolverAResultados}
              onCerrar={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
