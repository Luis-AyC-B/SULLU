"use client";

import { useState, useEffect } from "react";
import { Ambiente, EstadoAmbiente } from "../schemas/ambiente.schema";
import { X, CheckCircle2, Wrench, Ban } from "lucide-react";

interface EditarAmbienteModalProps {
  isOpen: boolean;
  ambiente: Ambiente | null;
  onClose: () => void;
  onGuardar: (ambienteId: string | number, nuevoEstado: EstadoAmbiente) => Promise<void>;
  isProcessing: boolean;
}

export function EditarAmbienteModal({
  isOpen,
  ambiente,
  onClose,
  onGuardar,
  isProcessing,
}: EditarAmbienteModalProps) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoAmbiente>("HABILITADO");

  useEffect(() => {
    if (ambiente) {
      const estadoUpper = ambiente.estado.toUpperCase();
      if (estadoUpper === "EN_REMODELACION" || estadoUpper === "REMODELACION") {
        setEstadoSeleccionado("EN_REMODELACION");
      } else if (estadoUpper === "INHABILITADO" || estadoUpper === "DESHABILITADO") {
        setEstadoSeleccionado("INHABILITADO");
      } else {
        setEstadoSeleccionado("HABILITADO");
      }
    }
  }, [ambiente]);

  if (!isOpen || !ambiente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar(ambiente.id, estadoSeleccionado);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border/80 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Editar estado del ambiente
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ambiente.nombre} · {ambiente.facultad || "FCyT"}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
              Estado del aula
            </label>

            <div className="space-y-2">
              {/* Opción Habilitado */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  estadoSeleccionado === "HABILITADO"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500"
                    : "border-border/80 bg-card hover:bg-muted/40 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Habilitado</p>
                    <p className="text-xs text-muted-foreground">Disponible para consulta y reserva de exámenes.</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="estadoAula"
                  value="HABILITADO"
                  checked={estadoSeleccionado === "HABILITADO"}
                  onChange={() => setEstadoSeleccionado("HABILITADO")}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              {/* Opción En remodelación */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  estadoSeleccionado === "EN_REMODELACION"
                    ? "border-rose-500 bg-rose-50/50 text-rose-950 ring-1 ring-rose-500"
                    : "border-border/80 bg-card hover:bg-muted/40 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">En remodelación</p>
                    <p className="text-xs text-muted-foreground">Bloquea la consulta y deshabilita reservas.</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="estadoAula"
                  value="EN_REMODELACION"
                  checked={estadoSeleccionado === "EN_REMODELACION"}
                  onChange={() => setEstadoSeleccionado("EN_REMODELACION")}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                />
              </label>

              {/* Opción Inhabilitado */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  estadoSeleccionado === "INHABILITADO"
                    ? "border-gray-500 bg-gray-50 text-gray-950 ring-1 ring-gray-500"
                    : "border-border/80 bg-card hover:bg-muted/40 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Ban className="w-4 h-4 text-gray-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Inhabilitado</p>
                    <p className="text-xs text-muted-foreground">Fuera de servicio institucional temporalmente.</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="estadoAula"
                  value="INHABILITADO"
                  checked={estadoSeleccionado === "INHABILITADO"}
                  onChange={() => setEstadoSeleccionado("INHABILITADO")}
                  className="w-4 h-4 text-gray-600 focus:ring-gray-500"
                />
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 active:bg-primary/95 transition-colors shadow-xs disabled:opacity-50"
            >
              {isProcessing ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
