// src/features/incidencias/components/ConfirmarDescargaObservacionesModal.tsx
"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

interface ConfirmarDescargaObservacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  materiaNombre: string;
  isDownloading: boolean;
  errorDescarga: string | null;
  onRetry?: () => void;
}

export function ConfirmarDescargaObservacionesModal({
  isOpen,
  onClose,
  onConfirm,
  materiaNombre,
  isDownloading,
  errorDescarga,
  onRetry,
}: ConfirmarDescargaObservacionesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDownloading && onClose()}>
      <DialogContent
        className="w-full max-w-md p-6 sm:p-7 rounded-2xl bg-white shadow-xl border border-gray-100"
        showCloseButton={!isDownloading}
      >
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#003770]">
            Confirmar descarga
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-left">
          <p className="text-sm text-gray-700 leading-relaxed">
            ¿Desea descargar las observaciones de ingreso de{" "}
            <span className="font-semibold text-gray-900">{materiaNombre}</span>?
          </p>

          <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 text-xs text-amber-900 leading-relaxed">
            <p className="font-medium">Aviso de sincronización:</p>
            <p className="mt-0.5 text-amber-800">
              El reporte incluye las observaciones de ingreso sincronizadas hasta este momento con los filtros seleccionados.
            </p>
          </div>

          {errorDescarga && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
            >
              <p className="font-medium">{errorDescarga}</p>
              {onRetry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isDownloading}
                  className="self-start gap-1.5 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isDownloading ? "animate-spin" : ""}`}
                  />
                  Reintentar
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDownloading}
            className="w-full sm:w-auto h-11 px-5 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDownloading}
            className="w-full sm:w-auto h-11 px-6 rounded-lg bg-[#003770] hover:bg-[#002850] text-white font-medium shadow-xs disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
