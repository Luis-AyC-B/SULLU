"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

interface ExamenesErrorProps {
  message?: string;
  onRetry: () => void;
}

export function ExamenesError({
  message = "Ocurrió un problema al cargar los exámenes asignados.",
  onRetry,
}: ExamenesErrorProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        Error al cargar exámenes
      </h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-[#002D62] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#001f45] transition-colors cursor-pointer"
      >
        <RotateCcw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}
