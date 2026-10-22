'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Download,
  EyeOff,
  HelpCircle,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Shield,
  Smile,
  Sun,
  XCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { getExamQrService } from '../api/exam-qr.service';
import {
  CODIGOS_ERROR_QR_EXAMEN,
  ExamQrError,
  type Examen,
  type RespuestaGenerarQrExamen,
} from '../types/qr-examen';
import {
  formatearFechaCorta,
  formatearFechaYHora,
  formatearHora,
} from '../lib/formato-fechas';
import { guardarQrExamenOffline } from '../lib/offline-portal';

export interface ExamQrModalProps {
  open: boolean;
  examen: Examen | null;
  verificacionFotoActiva?: boolean;
  fotoPerfilUrl?: string | null;
  estudianteNombre?: string;
  estudianteSis?: string;
  onClose: () => void;
  onExamenActualizado?: (examenId: number, cambios: Partial<Examen>) => void;
}

type PasoModal = 'DETALLE' | 'CAMARA' | 'REVISAR' | 'COMPARANDO' | 'RESULTADO_EXITO' | 'RESULTADO_FALLO' | 'TU_QR';

export function ExamQrModal({
  open,
  examen,
  verificacionFotoActiva = true,
  fotoPerfilUrl,
  estudianteNombre = 'Estudiante',
  estudianteSis = '—',
  onClose,
  onExamenActualizado,
}: ExamQrModalProps) {
  const [paso, setPaso] = useState<PasoModal>('DETALLE');
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  // Cámara
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [camaraError, setCamaraError] = useState<string | null>(null);

  // Estado del QR y verificación
  const [resultadoQr, setResultadoQr] = useState<RespuestaGenerarQrExamen | null>(null);
  const [intentosRestantes, setIntentosRestantes] = useState<number>(3);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);
  const [intentosAgotados, setIntentosAgotados] = useState(false);

  // Expiración en vivo del QR
  const [qrVencidoEnVivo, setQrVencidoEnVivo] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Detener cámara de forma segura
  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamaraActiva(false);
  }, []);

  // Limpiar URLs temporales de blobs
  const limpiarSelfieUrl = useCallback(() => {
    if (selfieUrl) {
      URL.revokeObjectURL(selfieUrl);
      setSelfieUrl(null);
    }
    setSelfieBlob(null);
  }, [selfieUrl]);

  // Reset del modal al abrir/cerrar
  useEffect(() => {
    if (open && examen) {
      setQrVencidoEnVivo(false);
      setErrorVerificacion(null);
      setIntentosAgotados(false);
      setIntentosRestantes(3);

      // Si el examen ya tiene QR generado y está vigente, mostrar directamente Paso 4 (Tu QR)
      if (examen.estadoQr === 'GENERADO' && examen.qrUrl) {
        setResultadoQr({
          qrUrl: examen.qrUrl,
          vigenteHasta: examen.qrVigenteHasta,
          token: examen.token || undefined,
        });
        setPaso('TU_QR');
      } else {
        setPaso('DETALLE');
        setResultadoQr(null);
      }
    } else {
      detenerCamara();
      limpiarSelfieUrl();
    }
  }, [open, examen, detenerCamara, limpiarSelfieUrl]);

  // Iniciar cámara con respaldo
  const iniciarCamara = useCallback(async () => {
    setCamaraError(null);
    detenerCamara();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCamaraError(
        'La cámara directa no está disponible en esta conexión o dispositivo. Puedes subir una foto desde tu galería o cámara.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
    } catch {
      setCamaraError(
        'No pudimos acceder a tu cámara web (permiso denegado o conexión no segura). Puedes subir tu fotografía directamente.',
      );
      setCamaraActiva(false);
    }
  }, [detenerCamara]);

  // Cambiar a paso cámara
  const irACamara = () => {
    if (!verificacionFotoActiva) {
      // Salto directo a generar QR sin cámara
      ejecutarGeneracionQr();
      return;
    }
    setPaso('CAMARA');
    setTimeout(() => {
      iniciarCamara();
    }, 100);
  };

  // Capturar fotograma de la cámara
  const tomarFoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        detenerCamara();
        limpiarSelfieUrl();
        setSelfieBlob(blob);
        setSelfieUrl(URL.createObjectURL(blob));
        setPaso('REVISAR');
      },
      'image/jpeg',
      0.9,
    );
  };

  // Respaldo input file si falla la cámara
  const handleArchivoRespaldo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      setCamaraError('El archivo debe ser una fotografía JPG o PNG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCamaraError('La fotografía no debe superar los 2 MB.');
      return;
    }

    detenerCamara();
    limpiarSelfieUrl();
    setSelfieBlob(file);
    setSelfieUrl(URL.createObjectURL(file));
    setPaso('REVISAR');
  };

  // Ejecutar llamada a generar QR
  const ejecutarGeneracionQr = async (blobFoto?: Blob) => {
    if (!examen) return;

    setPaso('COMPARANDO');

    try {
      const service = await getExamQrService();
      const res = await service.generarQrExamen(examen.id, blobFoto || selfieBlob || undefined);

      setResultadoQr(res);
      setPaso('RESULTADO_EXITO');

      // Guardar QR del examen en almacenamiento offline
      guardarQrExamenOffline(examen.id, {
        qrUrl: res.qrUrl,
        vigenteHasta: res.vigenteHasta,
        token: res.token,
      });

      // Notificar actualización al contenedor padre
      onExamenActualizado?.(examen.id, {
        estadoQr: 'GENERADO',
        qrGenerado: true,
        qrUrl: res.qrUrl,
        qrVigenteHasta: res.vigenteHasta,
        token: res.token,
      });

      // Transición automática al paso final tras breve feedback
      setTimeout(() => {
        setPaso('TU_QR');
      }, 700);
    } catch (err: unknown) {

      if (err instanceof ExamQrError) {
        setErrorVerificacion(err.message);
        if (typeof err.intentosRestantes === 'number') {
          setIntentosRestantes(err.intentosRestantes);
          if (err.intentosRestantes <= 0 || err.codigo === CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_INTENTOS_AGOTADOS) {
            setIntentosAgotados(true);
          }
        }
      } else {
        setErrorVerificacion('No pudimos verificar tu identidad. Intenta de nuevo.');
      }

      setPaso('RESULTADO_FALLO');
    }
  };

  // Temporizador para detectar expiración en vivo en Paso 4
  useEffect(() => {
    if (paso !== 'TU_QR' || !resultadoQr?.vigenteHasta) return;

    const fechaFinMs = new Date(resultadoQr.vigenteHasta).getTime();
    const verificarExpiracion = () => {
      if (Date.now() >= fechaFinMs) {
        setQrVencidoEnVivo(true);
        if (examen) {
          onExamenActualizado?.(examen.id, { estadoQr: 'FINALIZADO' });
        }
      }
    };

    verificarExpiracion();
    const timer = setInterval(verificarExpiracion, 1000);

    return () => clearInterval(timer);
  }, [paso, resultadoQr, examen, onExamenActualizado]);

  // Descarga de credencial QR en PNG de alta resolución
  const handleDescargarPng = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !examen || !resultadoQr) return;

    try {
      const cardCanvas = document.createElement('canvas');
      const w = 700;
      const h = 880;
      cardCanvas.width = w;
      cardCanvas.height = h;
      const ctx = cardCanvas.getContext('2d');
      if (!ctx) return;

      // Fondo blanco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      // Borde exterior redondeado institucional
      ctx.strokeStyle = '#003770';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      // Cabecera institucional
      ctx.fillStyle = '#003770';
      ctx.fillRect(16, 16, w - 32, 90);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('UNIVERSIDAD MAYOR DE SAN SIMÓN', w / 2, 54);
      ctx.font = '14px sans-serif';
      ctx.fillText('EXACONTROL · CREDENCIAL DE ACCESO AL EXAMEN', w / 2, 82);

      // Dibujar QR
      ctx.drawImage(canvas, (w - 260) / 2, 130, 260, 260);

      // Datos del examen y estudiante
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(examen.nombre, w / 2, 430);

      ctx.fillStyle = '#475569';
      ctx.font = '15px sans-serif';
      ctx.fillText(`${examen.carrera} · ${examen.ambiente}`, w / 2, 465);
      ctx.fillText(
        `Horario: ${formatearFechaCorta(examen.fechaInicio)} ${formatearHora(examen.fechaInicio)} – ${formatearHora(examen.fechaFin)}`,
        w / 2,
        495,
      );

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 525);
      ctx.lineTo(w - 80, 525);
      ctx.stroke();

      ctx.fillStyle = '#003770';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(estudianteNombre, w / 2, 560);
      ctx.fillStyle = '#475569';
      ctx.font = '14px monospace';
      ctx.fillText(`CÓDIGO SIS: ${estudianteSis}`, w / 2, 588);

      // Banner de vigencia
      ctx.fillStyle = '#ECFDF5';
      ctx.fillRect(80, 620, w - 160, 48);
      ctx.strokeStyle = '#A7F3D0';
      ctx.strokeRect(80, 620, w - 160, 48);
      ctx.fillStyle = '#065F46';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Válido hasta las ${formatearHora(resultadoQr.vigenteHasta)}`, w / 2, 650);

      // Aviso legal
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Código personal e intransferible para control de ingreso.', w / 2, 730);

      const dataUrl = cardCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `QR-Examen-${examen.id}-${estudianteSis}.png`;
      a.click();
    } catch {
      // Ignorar fallo de exportación de canvas en tests
    }
  };

  if (!examen) return null;

  // Contador de intento para resultado fallido (1 a 3)
  const intentoActual = Math.min(3, Math.max(1, 4 - intentosRestantes));

  return (
    <Dialog open={open} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent
        className="max-w-xl p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
        onEscapeKeyDown={onClose}
      >
        <DialogTitle className="sr-only">
          Generar código QR del examen {examen.nombre}
        </DialogTitle>

        {/* Indicador de Pasos Accesible */}
        <div className="border-b border-border bg-muted/40 px-6 py-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>
              {verificacionFotoActiva
                ? paso === 'DETALLE'
                  ? 'Paso 1 de 4'
                  : paso === 'CAMARA' || paso === 'REVISAR' || paso === 'COMPARANDO'
                  ? 'Paso 2 de 4'
                  : paso === 'RESULTADO_EXITO' || paso === 'RESULTADO_FALLO'
                  ? 'Paso 3 de 4'
                  : 'Paso 4 de 4'
                : paso === 'DETALLE'
                ? 'Paso 1 de 2'
                : 'Paso 2 de 2'}
            </span>
            <span className="uppercase tracking-wider text-primary text-[11px]">
              {paso === 'DETALLE'
                ? 'Examen'
                : paso === 'CAMARA' || paso === 'REVISAR' || paso === 'COMPARANDO'
                ? 'Verificación'
                : paso === 'RESULTADO_EXITO' || paso === 'RESULTADO_FALLO'
                ? 'Resultado'
                : 'Tu QR'}
            </span>
          </div>

          {/* Barra de progreso visual */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5">
            {['Examen', 'Verificación', 'Resultado', 'Tu QR']
              .filter((nombre) => verificacionFotoActiva || nombre === 'Examen' || nombre === 'Tu QR')
              .map((etiqueta, idx) => {
                const pasoActualIndex =
                  paso === 'DETALLE'
                    ? 0
                    : paso === 'CAMARA' || paso === 'REVISAR' || paso === 'COMPARANDO'
                    ? 1
                    : paso === 'RESULTADO_EXITO' || paso === 'RESULTADO_FALLO'
                    ? 2
                    : 3;
                const activo = idx <= pasoActualIndex;
                return (
                  <div key={etiqueta} className="flex-1 flex flex-col gap-1 items-center">
                    <div
                      className={`h-1.5 w-full rounded-full transition-colors ${
                        activo ? 'bg-primary' : 'bg-muted-foreground/20'
                      }`}
                    />
                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                      {etiqueta}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* CONTENIDO SEGÚN EL PASO */}
        <div className="p-6">
          {/* PASO 1: DETALLE DEL EXAMEN */}
          {paso === 'DETALLE' && (
            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  CONFIRMA TU EVALUACIÓN
                </span>
                <h2 className="text-xl font-extrabold text-foreground mt-0.5">
                  Detalle del examen
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Revisa los datos antes de continuar.
                </p>
              </div>

              {/* Tarjeta de información del examen */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  EXAMEN
                </span>
                <h3 className="text-base font-bold text-foreground mt-1">
                  {examen.nombre}
                </h3>
                <p className="text-xs text-muted-foreground">{examen.carrera}</p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-border/60">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-muted-foreground">Ambiente</div>
                      <div className="font-medium text-foreground">{examen.ambiente}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-muted-foreground">Fecha</div>
                      <div className="font-medium text-foreground">
                        {formatearFechaCorta(examen.fechaInicio)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-muted-foreground">Horario</div>
                      <div className="font-medium text-foreground">
                        {formatearHora(examen.fechaInicio)} – {formatearHora(examen.fechaFin)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aviso azul de privacidad */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900">
                <Shield className="h-5 w-5 shrink-0 text-blue-700 mt-0.5" />
                <div>
                  <strong className="font-semibold">Verificación de identidad:</strong> Por
                  seguridad, verificaremos tu identidad antes de generar tu QR. La foto no se
                  guarda después de verificar.
                </div>
              </div>

              {/* Chip de disponibilidad */}
              <div className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground bg-muted/50 border border-border px-3 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>QR disponible hasta las {formatearHora(examen.fechaFin)}</span>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="min-h-[44px] text-xs font-medium px-5"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={irACamara}
                  className="min-h-[44px] text-xs font-semibold px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: CÁMARA & VERIFICACIÓN */}
          {paso === 'CAMARA' && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  VERIFICACIÓN DE IDENTIDAD
                </span>
                <h2 className="text-lg font-bold text-foreground mt-0.5">
                  Toma una foto para verificar que eres tú
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ubica tu rostro dentro del marco y mira directamente a la cámara.
                </p>
              </div>

              {/* Contenedor de cámara con marco ovalado */}
              <div className="relative mx-auto flex h-64 w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-black">
                {camaraActiva ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-white">
                    {camaraError ? (
                      <p className="text-xs text-amber-200 mb-3">{camaraError}</p>
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-white/70 mb-2" />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      capture="user"
                      onChange={handleArchivoRespaldo}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[44px] text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/30"
                    >
                      <Camera className="h-4 w-4 mr-1.5" />
                      Subir foto desde dispositivo
                    </Button>
                  </div>
                )}

                {/* Guía ovalada centrada */}
                {camaraActiva && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="h-44 w-36 rounded-[50%] border-2 border-dashed border-white/90 shadow-2xl" />
                    <span className="mt-2 text-[11px] font-medium text-white/90 bg-black/50 px-2 py-0.5 rounded-full">
                      Centra tu rostro
                    </span>
                  </div>
                )}
              </div>

              {/* Recomendaciones breves */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2">
                  <Sun className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>Buena luz</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2">
                  <EyeOff className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Sin lentes oscuros</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2">
                  <Smile className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>Sin gorra</span>
                </div>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                ✓ La foto no se guarda después de verificar
              </p>

              {/* Botones de acción */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                {camaraActiva && (
                  <Button
                    type="button"
                    onClick={tomarFoto}
                    className="w-full min-h-[44px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                  >
                    <Camera className="h-4 w-4" />
                    Tomar foto
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    detenerCamara();
                    setPaso('DETALLE');
                  }}
                  className="min-h-[44px] text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2.B: REVISAR FOTO */}
          {paso === 'REVISAR' && selfieUrl && (
            <div className="flex flex-col gap-4 text-center">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  VERIFICACIÓN DE IDENTIDAD
                </span>
                <h2 className="text-lg font-bold text-foreground mt-0.5">Revisa tu foto</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Asegúrate de que tu rostro se vea claro y centrado.
                </p>
              </div>

              <div className="relative mx-auto flex h-60 w-52 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary/30 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selfieUrl}
                  alt="Selfie tomada"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex items-center justify-center gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    limpiarSelfieUrl();
                    setPaso('CAMARA');
                    iniciarCamara();
                  }}
                  className="min-h-[44px] gap-2 text-xs font-semibold px-4"
                >
                  <RotateCcw className="h-4 w-4" />
                  Repetir
                </Button>
                <Button
                  type="button"
                  onClick={() => ejecutarGeneracionQr()}
                  className="min-h-[44px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-6"
                >
                  <Check className="h-4 w-4" />
                  Usar esta foto
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2.C: COMPARANDO CON FOTO DE PERFIL */}
          {paso === 'COMPARANDO' && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Comparando con tu foto de perfil…
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Esto tomará solo unos segundos.
                </p>
              </div>

              {fotoPerfilUrl && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoPerfilUrl}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1.5">
                    Foto de perfil registrada
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PASO 3.A: RESULTADO EXITOSO */}
          {paso === 'RESULTADO_EXITO' && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <CheckCircle2 className="h-16 w-16 text-emerald-600 animate-in zoom-in-75 duration-300" />
              <h3 className="text-xl font-bold text-foreground">
                Identidad verificada
              </h3>
              <p className="text-xs text-muted-foreground">Generando tu QR…</p>
            </div>
          )}

          {/* PASO 3.B: RESULTADO FALLIDO */}
          {paso === 'RESULTADO_FALLO' && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <XCircle className="h-10 w-10" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  No pudimos verificar tu identidad
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {errorVerificacion || 'No se generó tu QR del examen.'}
                </p>
              </div>

              <div className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                Intento {intentoActual} de 3
              </div>

              {/* Botón de reintento */}
              <Button
                type="button"
                disabled={intentosAgotados}
                onClick={() => {
                  limpiarSelfieUrl();
                  setPaso('CAMARA');
                  iniciarCamara();
                }}
                className="w-full min-h-[44px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
              >
                <RefreshCw className="h-4 w-4" />
                Intentar de nuevo
              </Button>

              {/* Caja de ayuda para verificación manual */}
              <div className="w-full rounded-xl border border-border bg-muted/30 p-3.5 text-left text-xs">
                <div className="flex items-start gap-2 text-foreground font-semibold">
                  <HelpCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>¿Sigues teniendo problemas?</span>
                </div>
                <p className="text-muted-foreground mt-1 ml-6">
                  Acércate al personal de control para una verificación manual de tu identidad.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="min-h-[44px] text-xs font-medium"
              >
                Cerrar
              </Button>
            </div>
          )}

          {/* PASO 4: TU CÓDIGO ESTÁ LISTO (O VENCIDO EN VIVO) */}
          {paso === 'TU_QR' && resultadoQr && (
            <div className="flex flex-col items-center text-center gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  TU CÓDIGO ESTÁ LISTO
                </span>
                <h2 className="text-xl font-extrabold text-foreground mt-0.5">
                  ¡Tu código está listo!
                </h2>
              </div>

              {/* Contenedor del QR con capa difuminada si venció en vivo */}
              <div className="relative flex items-center justify-center p-4 rounded-2xl border-2 border-border bg-white shadow-inner">
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={resultadoQr.qrUrl}
                  size={210}
                  level="H"
                  includeMargin={true}
                />

                {qrVencidoEnVivo && (
                  <div
                    data-testid="qr-vencido-overlay"
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-900/80 p-4 text-center text-white backdrop-blur-xs animate-in fade-in duration-300"
                  >
                    <Clock className="h-10 w-10 text-amber-400 mb-2" />
                    <p className="text-sm font-bold">Tu QR venció</p>
                    <p className="text-xs text-slate-300 mt-1">
                      El examen terminó a las {formatearHora(resultadoQr.vigenteHasta)}. Este
                      código ya no es válido.
                    </p>
                  </div>
                )}
              </div>

              {/* Datos del estudiante y examen (SIN CI, teléfono ni correo) */}
              <div className="w-full rounded-xl border border-border bg-muted/20 p-3.5 text-xs text-left">
                <div className="font-bold text-foreground text-sm">{examen.nombre}</div>
                <div className="text-muted-foreground">{examen.carrera} · {examen.ambiente}</div>
                <div className="mt-2 pt-2 border-t border-border flex justify-between text-muted-foreground">
                  <span>Estudiante: <strong className="text-foreground">{estudianteNombre}</strong></span>
                  <span>SIS: <span className="font-mono text-foreground font-semibold">{estudianteSis}</span></span>
                </div>
              </div>

              {/* Etiqueta de vigencia */}
              {qrVencidoEnVivo ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3.5 py-1 text-xs font-medium text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Venció a las {formatearHora(resultadoQr.vigenteHasta)}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 px-3.5 py-1 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Válido hasta {formatearFechaYHora(resultadoQr.vigenteHasta)}</span>
                </div>
              )}

              {/* Aviso intransferible */}
              <p className="text-[11px] text-muted-foreground">
                Código personal e intransferible. Preséntalo al personal de control para registrar tu ingreso.
              </p>

              {/* Botones de acción */}
              <div className="flex w-full items-center justify-center gap-3 pt-2 border-t border-border">
                {!qrVencidoEnVivo && (
                  <Button
                    type="button"
                    onClick={handleDescargarPng}
                    variant="outline"
                    className="flex-1 min-h-[44px] gap-2 text-xs font-semibold"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PNG
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[44px] text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

