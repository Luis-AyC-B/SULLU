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
    const qrCanvas = canvasRef.current;
    if (!qrCanvas || !qr) return;

    // Crear canvas para la credencial completa de alta resolución (800x1000)
    const cardCanvas = document.createElement('canvas');
    const width = 800;
    const height = 1000;
    cardCanvas.width = width;
    cardCanvas.height = height;
    const ctx = cardCanvas.getContext('2d');
    if (!ctx) return;

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Borde exterior de la tarjeta con esquinas redondeadas
    const radius = 24;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, height - radius);
    ctx.quadraticCurveTo(width, height, width - radius, height);
    ctx.lineTo(radius, height);
    ctx.quadraticCurveTo(0, height, 0, height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Banda superior institucional
    ctx.fillStyle = '#1E40AF';
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(width - radius, 0);
    ctx.quadraticCurveTo(width, 0, width, radius);
    ctx.lineTo(width, 10);
    ctx.lineTo(0, 10);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // Encabezado institucional
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E40AF';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('EXACONTROL · UMSS', width / 2, 60);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CREDENCIAL DIGITAL DE ACCESO', width / 2, 88);

    // Contenedor blanco para el código QR
    const qrBoxSize = 460;
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = 125;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
    } else {
      ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
    }
    ctx.fill();
    ctx.stroke();

    // Dibujar el código QR centrado dentro del contenedor
    const qrPadding = 24;
    ctx.drawImage(
      qrCanvas,
      qrBoxX + qrPadding,
      qrBoxY + qrPadding,
      qrBoxSize - qrPadding * 2,
      qrBoxSize - qrPadding * 2,
    );

    // Nombre completo del estudiante en negrita
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(qr.nombre, width / 2, 650);

    // Datos de SIS y CI
    ctx.fillStyle = '#334155';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`SIS: ${qr.sis}   •   CI: ${qr.ci}`, width / 2, 695);

    // Línea divisoria decorativa
    ctx.beginPath();
    ctx.moveTo(120, 740);
    ctx.lineTo(width - 120, 740);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Texto legal / Instrucciones al pie
    ctx.fillStyle = '#64748B';
    ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      'Código personal e intransferible.',
      width / 2,
      785,
    );
    ctx.fillText(
      'Preséntalo al personal de control para registrar tu ingreso.',
      width / 2,
      815,
    );

    // Pie institucional
    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      'Universidad Mayor de San Simón · Control de Ingreso a Exámenes',
      width / 2,
      940,
    );

    // Descargar credencial completa en formato PNG
    const enlace = document.createElement('a');
    enlace.href = cardCanvas.toDataURL('image/png');
    enlace.download = `Credencial-QR-${qr.sis}.png`;
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
              <div className="mt-5 rounded-xl border border-border bg-white p-2 shadow-xs">
                <QRCodeCanvas
                  ref={canvasRef}
                  value={qr.qrUrl || qr.token}
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
              Descargar Credencial QR
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
