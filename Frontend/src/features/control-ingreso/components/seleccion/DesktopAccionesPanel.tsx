"use client";

import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface DesktopAccionesPanelProps {
  selectedExam: ExamenAsignado | null;
  onIniciarControl: () => void;
}

export function DesktopAccionesPanel({
  selectedExam,
  onIniciarControl,
}: DesktopAccionesPanelProps) {
  const isEnabled = selectedExam !== null;

  return (
    <div className="hidden lg:block w-80 xl:w-96 shrink-0">
      <div className="sticky top-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Acciones de registro
        </h2>

        {isEnabled ? (
          <div className="rounded-xl bg-[#f0f4f9] p-4 mb-5 border border-slate-200/50">
            <p className="font-bold text-slate-900 text-sm">
              {selectedExam.asignatura}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {selectedExam.ambiente} · {selectedExam.horario}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 mb-5 border border-dashed border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Selecciona uno de tus exámenes asignados para iniciar el control.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onIniciarControl}
          disabled={!isEnabled}
          className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer shadow-xs ${
            isEnabled
              ? "bg-[#002D62] hover:bg-[#001f45] text-white active:scale-[0.99]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Iniciar control
        </button>
      </div>
    </div>
  );
}
