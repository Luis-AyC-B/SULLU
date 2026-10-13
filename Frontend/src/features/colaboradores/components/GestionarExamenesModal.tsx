"use client";

import { useState } from "react";
import { X, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { Colaborador, ExamenItem } from "../schemas/colaborador.schema";
import { useExamenesColaborador } from "../hooks/useExamenesColaborador";
import { QuitarExamenDialog } from "./QuitarExamenDialog";

interface GestionarExamenesModalProps {
  isOpen: boolean;
  colaborador: Colaborador | null;
  onClose: () => void;
  onActualizado?: () => void;
}

export function GestionarExamenesModal({
  isOpen,
  colaborador,
  onClose,
  onActualizado,
}: GestionarExamenesModalProps) {
  const { asignados, disponibles, loading, error, asignar, quitar } =
    useExamenesColaborador(isOpen ? colaborador : null);

  const [examenAQuitar, setExamenAQuitar] = useState<ExamenItem | null>(null);
  const [isQuitarDialogOpen, setIsQuitarDialogOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !colaborador) return null;

  const handleOpenQuitar = (examen: ExamenItem) => {
    setActionError(null);
    setExamenAQuitar(examen);
    setIsQuitarDialogOpen(true);
  };

  const handleConfirmQuitar = async () => {
    if (!examenAQuitar) return;
    try {
      setIsProcessing(true);
      const res = await quitar(examenAQuitar.id);
      if (!res.success) {
        setActionError(res.error || "No se pudo retirar del examen");
      } else {
        setIsQuitarDialogOpen(false);
        setExamenAQuitar(null);
        onActualizado?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAsignar = async (examenId: string | number) => {
    setActionError(null);
    try {
      setIsProcessing(true);
      const res = await asignar(examenId);
      if (!res.success) {
        setActionError(res.error || "No se pudo asignar el examen");
      } else {
        onActualizado?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200/80 p-6 sm:p-7 relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Encabezado */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-[#003770]">
              Exámenes de {colaborador.nombreCompleto}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Administra sus asignaciones de control.
            </p>
          </div>

          <div className="border-t border-gray-100 my-1" />

          {/* Errores */}
          {(error || actionError) && (
            <div className="my-3 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError || error}</span>
            </div>
          )}

          {/* Contenido scrolleable */}
          <div className="overflow-y-auto pr-1 space-y-6 flex-1 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Cargando exámenes...</span>
              </div>
            ) : (
              <>
                {/* SECCIÓN ASIGNADOS */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800 tracking-wider">
                      ASIGNADOS
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {asignados.length} {asignados.length === 1 ? "examen" : "exámenes"}
                    </span>
                  </div>

                  {asignados.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                      No tiene exámenes asignados actualmente.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {asignados.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-[#003770] text-sm">
                              {item.materia} · {item.parcial}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.fecha} · {item.periodo} · {item.horario}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span>{item.ubicacion}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            {item.yaInicio ? (
                              <>
                                <button
                                  type="button"
                                  disabled
                                  className="bg-gray-100 text-gray-400 border border-gray-200 font-medium text-xs px-4 py-2 rounded-lg cursor-not-allowed opacity-60"
                                >
                                  Quitar
                                </button>
                                <span className="text-[11px] text-gray-400 mt-1">
                                  El examen ya inició
                                </span>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenQuitar(item)}
                                disabled={isProcessing}
                                className="border border-gray-200 bg-white hover:bg-rose-50 text-rose-600 hover:border-rose-200 font-medium text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECCIÓN DISPONIBLES */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800 tracking-wider">
                      DISPONIBLES
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {disponibles.length} {disponibles.length === 1 ? "examen" : "exámenes"}
                    </span>
                  </div>

                  {disponibles.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                      No hay más exámenes disponibles para asignar.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {disponibles.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gray-300 transition-colors"
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-[#003770] text-sm">
                              {item.materia} · {item.parcial}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.fecha} · {item.periodo} · {item.horario}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span>{item.ubicacion}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            {item.tieneChoque ? (
                              <>
                                <button
                                  type="button"
                                  disabled
                                  className="bg-gray-100 text-gray-400 border border-gray-200 font-medium text-xs px-4 py-2 rounded-lg cursor-not-allowed opacity-60"
                                >
                                  Asignar
                                </button>
                                <span className="bg-amber-50 text-amber-700 font-medium text-[11px] px-2 py-0.5 rounded border border-amber-200 text-center mt-1">
                                  Choque de horario
                                </span>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAsignar(item.id)}
                                disabled={isProcessing}
                                className="border border-blue-200 text-[#003770] hover:bg-blue-50 font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                              >
                                Asignar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer del modal con botón Listo */}
          <div className="border-t border-gray-100 pt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#003770] hover:bg-[#002a57] text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-xs cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      </div>

      <QuitarExamenDialog
        isOpen={isQuitarDialogOpen}
        colaboradorNombre={colaborador.nombreCompleto}
        examen={examenAQuitar}
        onClose={() => {
          setIsQuitarDialogOpen(false);
          setExamenAQuitar(null);
        }}
        onConfirm={handleConfirmQuitar}
        isProcessing={isProcessing}
      />
    </>
  );
}
