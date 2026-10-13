"use client";

import { useState } from "react";
import { ConnectionStatusBadge } from "../shared/ConnectionStatusBadge";
import { ExamenActivoHeaderCard } from "./ExamenActivoHeaderCard";
import { AccionesOperativasGrid } from "./AccionesOperativasGrid";
import { ResumenEnVivoCard } from "./ResumenEnVivoCard";
import { UltimosIngresosCard } from "./UltimosIngresosCard";
import { RegistroManualModal } from "../manual/RegistroManualModal";
import { EscanearQrModal } from "../escanear/EscanearQrModal";
import { useResumenEnVivo } from "../../hooks/useResumenEnVivo";
import { useActiveExam } from "../../store/useActiveExamStore";
import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface ExamenActivoViewProps {
  examen: ExamenAsignado;
}

export function ExamenActivoView({ examen }: ExamenActivoViewProps) {
  const { clearExamenActivo } = useActiveExam();
  const { resumen, isLoading, refetch } = useResumenEnVivo(examen.id);
  const [isModalManualOpen, setIsModalManualOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <div className="w-full pb-20 md:pb-8 animate-in fade-in duration-300">
      {/* Header Superior según Mockup */}
      <div className="mb-4 md:mb-6">
        <p className="hidden md:block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1">
          PERSONAL DE CONTROL
        </p>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Control de ingreso
          </h1>
          <ConnectionStatusBadge status="sincronizado" />
        </div>
      </div>

      {/* Tarjeta Superior del Examen Activo */}
      <ExamenActivoHeaderCard
        examen={examen}
        onCambiarExamen={clearExamenActivo}
      />

      {/* VERSIÓN MOBILE: Resumen en vivo debajo de la tarjeta, luego acciones operativas */}
      <div className="block md:hidden space-y-4">
        <ResumenEnVivoCard resumen={resumen} isLoading={isLoading} />
        <AccionesOperativasGrid
          onAbrirRegistroManual={() => setIsModalManualOpen(true)}
          onAbrirScanner={() => setIsScannerOpen(true)}
        />
      </div>

      {/* VERSIÓN DESKTOP: Layout a 2 Columnas */}
      <div className="hidden md:flex flex-row items-start gap-8">
        {/* Columna Izquierda: Acciones Operativas (QR, Manual, Incidencias) */}
        <div className="flex-1 w-full space-y-5">
          <AccionesOperativasGrid
            onAbrirRegistroManual={() => setIsModalManualOpen(true)}
            onAbrirScanner={() => setIsScannerOpen(true)}
          />
        </div>

        {/* Columna Derecha: Resumen en vivo y Últimos ingresos */}
        <div className="w-80 xl:w-96 shrink-0 space-y-5">
          <ResumenEnVivoCard resumen={resumen} isLoading={isLoading} />
          <UltimosIngresosCard
            ingresos={resumen?.ultimosIngresos ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modal Adaptativo para Registro Manual (Desktop Modal / Mobile Hoja Inferior) */}
      <RegistroManualModal
        examen={examen}
        isOpen={isModalManualOpen}
        onClose={() => setIsModalManualOpen(false)}
        onIngresoExitoso={refetch}
      />

      {/* Modal de Escáner QR continuo en Dispositivos Móviles (HU8) */}
      <EscanearQrModal
        examen={examen}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onIngresoExitoso={refetch}
        onAbrirRegistroManual={() => {
          setIsScannerOpen(false);
          setIsModalManualOpen(true);
        }}
      />
    </div>
  );
}
