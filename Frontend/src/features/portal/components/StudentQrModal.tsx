'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { getMiQr } from '../api/student-exam.service';
import type { StudentQrPayload } from '../types/student-exam.types';

interface StudentQrModalProps {
  open: boolean;
  onClose: () => void;
}

export function StudentQrModal({ open, onClose }: StudentQrModalProps) {
  const [qr, setQr] = useState<StudentQrPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setQr(await getMiQr());
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qr) return;
    const enlace = document.createElement('a');
    enlace.href = canvas.toDataURL('image/png');
    enlace.download = `QR-${qr.sis}.png`;
    enlace.click();
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 p-0 sm:max-w-[480px]! max-sm:top-0! max-sm:left-0! max-sm:h-dvh max-sm:w-full max-sm:max-w-none! max-sm:translate-x-0! max-sm:translate-y-0! max-sm:overflow-y-auto max-sm:rounded-none! max-sm:bg-background"
      >
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-5 pt-5 text-sm font-medium text-primary sm:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
          Mis exámenes
        </button>

        <div className="flex flex-col items-center px-6 pb-8 pt-6 sm:pt-8">
          <DialogTitle className="text-xs font-medium tracking-wide text-primary">
            CÓDIGO QR · ESTUDIANTE
          </DialogTitle>

          {isLoading && (
            <div className="flex h-72 items-center justify-center" role="status" aria-label="Generando código QR">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {hasError && !isLoading && (
            <div role="alert" className="flex h-72 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">No pudimos generar tu código QR.</p>
              <Button variant="outline" onClick={load}>
                Reintentar
              </Button>
            </div>
          )}

          {qr && !isLoading && !hasError && (
            <>
              <div className="mt-5 rounded-xl border border-border bg-white p-2">
                <QRCodeCanvas
                  ref={canvasRef}
                  value={qr.token}
                  size={1024}
                  marginSize={4}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#1A1A1A"
                  style={{ width: 220, height: 220 }}
                />
              </div>

              <h2 className="mt-6 text-xl font-bold text-foreground">{qr.nombre}</h2>
              <p className="mt-3 text-sm text-foreground">SIS: {qr.sis}</p>
              <p className="mt-2 text-sm text-foreground">CI: {qr.ci}</p>

              <p className="mt-6 max-w-xs text-center text-sm text-muted-foreground">
                Código personal e intransferible. Preséntalo al personal de control para registrar tu ingreso.
              </p>
            </>
          )}

          {qr && !isLoading && !hasError && (
            <Button onClick={handleDownload} className="mt-6 h-11 w-full gap-2">
              <Download className="h-4 w-4" />
              Descargar QR
            </Button>
          )}

          <Button variant="outline" onClick={onClose} className="mt-3 hidden h-11 w-full text-primary sm:inline-flex">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}