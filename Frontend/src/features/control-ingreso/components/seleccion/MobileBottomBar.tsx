"use client";

import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface MobileBottomBarProps {
  selectedExam: ExamenAsignado | null;
  onIniciarControl: () => void;
}

export function MobileBottomBar({
  selectedExam,
  onIniciarControl,
}: MobileBottomBarProps) {
  if (!selectedExam) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 md:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="mx-auto flex max-w-screen-md items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 leading-tight">
            {selectedExam.asignatura}
          </p>
          <p className="truncate text-xs text-slate-500 mt-0.5">
            {selectedExam.ambiente} · {selectedExam.horario}
          </p>
        </div>

        <button
          type="button"
          onClick={onIniciarControl}
          className="shrink-0 rounded-xl bg-[#002D62] hover:bg-[#001f45] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-colors cursor-pointer active:scale-95"
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}
