"use client";

import { ClipboardMinus } from "lucide-react";
import { ExamenItem } from "../schemas/colaborador.schema";

interface QuitarExamenDialogProps {
  isOpen: boolean;
  colaboradorNombre: string;
  examen: ExamenItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing?: boolean;
}

export function QuitarExamenDialog({
  isOpen,
  colaboradorNombre,
  examen,
  onClose,
  onConfirm,
  isProcessing = false,
}: QuitarExamenDialogProps) {
  if (!isOpen || !examen) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200/80 p-6 text-center relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-rose-600 mb-4">
          <ClipboardMinus className="h-6 w-6 text-rose-600" />
        </div>

        <h3 className="text-xl font-bold text-[#003770]">
          ¿Quitar a {colaboradorNombre} del examen?
        </h3>
        <p className="text-xs text-gray-500 mt-1 mb-5">
          Dejará de controlar este examen.
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-left mb-6">
          <h4 className="font-bold text-[#003770] text-sm">
            {examen.materia} · {examen.parcial}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {examen.fecha} · {examen.ubicacion}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="border border-gray-300 text-gray-700 font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 flex-1 text-sm transition-colors cursor-pointer"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium px-5 py-2.5 rounded-xl flex-1 text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? "Quitando..." : "Sí, quitar"}
          </button>
        </div>
      </div>
    </div>
  );
}
