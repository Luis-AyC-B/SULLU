"use client";

import { useState, useEffect } from "react";
import { ConnectionStatusBadge } from "../shared/ConnectionStatusBadge";
import { ExamenCard } from "./ExamenCard";
import { DesktopAccionesPanel } from "./DesktopAccionesPanel";
import { MobileBottomBar } from "./MobileBottomBar";
import { ExamenesSkeleton } from "./ExamenesSkeleton";
import { ExamenesError } from "./ExamenesError";
import { ExamenesEmpty } from "./ExamenesEmpty";
import { useExamenesAsignados } from "../../hooks/useExamenesAsignados";
import { useActiveExam } from "../../store/useActiveExamStore";
import type { ExamenAsignado } from "../../types/control-ingreso.types";

export function SeleccionExamenView() {
  const { examenes, isLoading, error, refetch } = useExamenesAsignados();
  const { setExamenActivo } = useActiveExam();
  const [selectedExam, setSelectedExam] = useState<ExamenAsignado | null>(null);

  // Preselecciona el primer examen en curso o el primero disponible según el mockup
  useEffect(() => {
    if (examenes.length > 0 && !selectedExam) {
      const enCurso = examenes.find((e) => e.estado === "EN_CURSO");
      setSelectedExam(enCurso || examenes[0]);
    }
  }, [examenes, selectedExam]);

  const handleIniciarControl = () => {
    if (selectedExam) {
      setExamenActivo(selectedExam);
    }
  };

  return (
    <div className="w-full pb-20 md:pb-8 animate-in fade-in duration-300">
      {/* Header Superior según Mockup */}
      <div className="mb-6">
        <p className="hidden md:block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1">
          PERSONAL DE CONTROL
        </p>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Control de ingreso
          </h1>
          <ConnectionStatusBadge status="sincronizado" />
        </div>

        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
          Selección de examen
        </h2>
        <p className="text-sm text-slate-600">
          Elige uno de tus exámenes asignados para iniciar el control.
        </p>
      </div>

      {/* Contenido Principal a 2 Columnas (Desktop) / 1 Columna (Mobile) */}
      <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
        {/* Columna Izquierda: Lista de Exámenes */}
        <div className="flex-1 w-full">
          {isLoading && <ExamenesSkeleton />}

          {!isLoading && error && (
            <ExamenesError message={error} onRetry={refetch} />
          )}

          {!isLoading && !error && examenes.length === 0 && <ExamenesEmpty />}

          {!isLoading && !error && examenes.length > 0 && (
            <div className="flex flex-col gap-4">
              {examenes.map((examen) => (
                <ExamenCard
                  key={examen.id}
                  examen={examen}
                  isSelected={selectedExam?.id === examen.id}
                  onSelect={setSelectedExam}
                />
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Panel de Acciones en Desktop */}
        <DesktopAccionesPanel
          selectedExam={selectedExam}
          onIniciarControl={handleIniciarControl}
        />
      </div>

      {/* Barra Inferior Flotante en Mobile */}
      <MobileBottomBar
        selectedExam={selectedExam}
        onIniciarControl={handleIniciarControl}
      />
    </div>
  );
}
