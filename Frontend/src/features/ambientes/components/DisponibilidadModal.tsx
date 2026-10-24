"use client";

import { useEffect, useState } from "react";
import { Ambiente, PeriodoDisponibilidad } from "../schemas/ambiente.schema";
import { useDisponibilidad } from "../hooks/useDisponibilidad";
import { FechaSelector } from "./FechaSelector";
import { PeriodosList } from "./PeriodosList";
import { X } from "lucide-react";
import { fechasBolivia } from '../lib/integracion';

interface DisponibilidadModalProps {
  isOpen: boolean;
  ambiente: Ambiente | null;
  onClose: () => void;
  onSelectPeriodo: (ambiente: Ambiente, fecha: string, periodo: PeriodoDisponibilidad) => void;
  canReservar?: boolean;
  version?: number;
}

export function DisponibilidadModal({
  isOpen,
  ambiente,
  onClose,
  onSelectPeriodo,
  canReservar = false,
  version = 0,
}: DisponibilidadModalProps) {
  const [fecha, setFecha] = useState<string>(() => {
    return fechasBolivia().min;
  });
  useEffect(() => {
    if (isOpen) {
      const { min, max } = fechasBolivia();
      setFecha(current => current < min || current > max ? min : current);
    }
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const { periodos, isLoading, error, refetch } = useDisponibilidad(
    isOpen ? ambiente?.id ?? null : null,
    fecha,
    version
  );

  if (!isOpen || !ambiente) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border/80 overflow-hidden flex flex-col h-[575px] max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between p-5 border-b border-border/60 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Disponibilidad · {ambiente.nombre}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ambiente.facultad || "FCyT"} · {ambiente.tipoAula || "Aula común"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll y tamaño constante */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 min-h-0">
          <FechaSelector
            fechaSeleccionada={fecha}
            onSelectFecha={setFecha}
          />

          <PeriodosList
            periodos={periodos}
            isLoading={isLoading}
            error={error}
            onReintentar={refetch}
            onSelectPeriodo={(periodo) => onSelectPeriodo(ambiente, fecha, periodo)}
            canReservar={canReservar}
          />
        </div>
      </div>
    </div>
  );
}
