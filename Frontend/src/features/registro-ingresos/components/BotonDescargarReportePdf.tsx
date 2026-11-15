// src/features/registro-ingresos/components/BotonDescargarReportePdf.tsx
"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface BotonDescargarReportePdfProps {
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  isDownloading?: boolean;
}

export function BotonDescargarReportePdf({
  onClick,
  disabled = false,
  disabledReason,
  isDownloading = false,
}: BotonDescargarReportePdfProps) {
  const estaDeshabilitado = disabled || isDownloading;

  return (
    <div className="w-full sm:w-auto" title={disabledReason}>
      <Button
        type="button"
        onClick={onClick}
        disabled={estaDeshabilitado}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#003770] px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-[#002850] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Descargar PDF"
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Generando PDF...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4 shrink-0" />
            <span>Descargar PDF</span>
          </>
        )}
      </Button>
    </div>
  );
}
