"use client";

import { UserX } from "lucide-react";
import { Colaborador } from "../schemas/colaborador.schema";

interface AdminSolicitudRechazarModalProps {
  isOpen: boolean;
  colaborador: Colaborador | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing?: boolean;
}

export function AdminSolicitudRechazarModal({
  isOpen,
  colaborador,
  onClose,
  onConfirm,
  isProcessing = false,
}: AdminSolicitudRechazarModalProps) {
  if (!isOpen || !colaborador) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200/80 p-6 sm:p-7 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icono rojo en cuadro suave */}
        <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl w-12 h-12 flex items-center justify-center text-rose-600 mb-4">
          <UserX className="h-6 w-6 text-rose-600" />
        </div>

        {/* Título y subtítulo */}
        <h3 className="text-2xl font-bold text-[#003770]">
          ¿Rechazar solicitud?
        </h3>
        <p className="text-xs text-gray-500 mt-1 mb-5">
          El colaborador no se vinculará al docente. Revisa los datos antes de continuar.
        </p>

        {/* Caja de detalles */}
        <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-3 text-left mb-6">
          <div>
            <span className="block text-xs text-gray-500">Docente</span>
            <span className="font-bold text-[#003770] text-sm">
              {colaborador.docenteNombre || "Docente"}
            </span>
          </div>
          {colaborador.codSis && (
            <div>
              <span className="block text-xs text-gray-500">Código SIS</span>
              <span className="font-mono font-bold text-[#003770] text-sm">
                {colaborador.codSis}
              </span>
            </div>
          )}
          <div>
            <span className="block text-xs text-gray-500">Colaborador</span>
            <span className="font-bold text-[#003770] text-sm">
              {colaborador.nombreCompleto}
            </span>
          </div>
        </div>

        {/* Botones de acción */}
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
            {isProcessing ? "Rechazando..." : "Rechazar"}
          </button>
        </div>
      </div>
    </div>
  );
}
