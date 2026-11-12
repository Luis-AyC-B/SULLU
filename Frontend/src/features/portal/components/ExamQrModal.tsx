'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Camera,
  Circle,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  WifiOff,
  X,
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
  formatearFechaDdMmYyyy,
  formatearHora,
} from '../lib/formato-fechas';
import {
  guardarIntentosExamen,
  guardarQrExamenOffline,
  obtenerIntentosExamen,
} from '../lib/offline-portal';

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

type PasoModal = 'CAMARA' | 'COMPARANDO' | 'TU_QR' | 'FALLO' | 'ERROR_RED';

export function ExamQrModal({
  open,
  examen,
  fotoPerfilUrl,
  estudianteNombre = 'Estudiante',
  estudianteSis = '—',
  onClose,
  onExamenActualizado,
}: ExamQrModalProps) {
  const [paso, setPaso] = useState<PasoModal>('CAMARA');
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const temporal=useRef<string|null>(null), abierto=useRef(open); abierto.current=open;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (temporal.current) {
      URL.revokeObjectURL(temporal.current); temporal.current=null;
      setSelfieUrl(null);
    }
    setSelfieBlob(null);
  }, []);
  useEffect(()=>()=>{abierto.current=false;streamRef.current?.getTracks().forEach(t=>t.stop());if(temporal.current)URL.revokeObjectURL(temporal.current);},[]);

  // Iniciar cámara web / móvil frontal
  const iniciarCamara = useCallback(async () => {
    setCamaraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamaraError(
        'Tu navegador o dispositivo no soporta captura por cámara. Habilita los permisos o utiliza un dispositivo compatible.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if(!abierto.current){stream.getTracks().forEach(t=>t.stop());return;}
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Para generar el código QR debes permitir el acceso a tu cámara en los permisos del navegador.'
          : 'No se pudo acceder a la cámara. Verifica que no esté en uso por otra aplicación.';
      setCamaraError(msg);
      setCamaraActiva(false);
    }
  }, []);

  // Ejecutar llamada a generar QR tras captura
  useEffect(()=>{if(camaraActiva&&videoRef.current&&streamRef.current){videoRef.current.srcObject=streamRef.current;void videoRef.current.play().catch(()=>setCamaraError('No se pudo reproducir la cámara'));}},[camaraActiva,paso]);
  const ejecutarGeneracionQr = useCallback(
    async (blobFoto: Blob) => {
      if (!examen) return;

      setIsSubmitting(true);
      setPaso('COMPARANDO');

      try {
        const service = await getExamQrService();
        // Genera QR pasando la foto para validación biométrica en backend
        const res = await service.generarQrExamen(examen.id, blobFoto);

        setResultadoQr(res);

        // Guardar QR del examen en almacenamiento offline
        guardarQrExamenOffline(examen.id, {
          qrUrl: res.qrUrl,
          vigenteHasta: res.vigenteHasta,
          token: res.token,
        });

        // Actualizar examen
        onExamenActualizado?.(examen.id, {
          estadoQr: 'GENERADO',
          qrGenerado: true,
          qrUrl: res.qrUrl,
          qrVigenteHasta: res.vigenteHasta,
          token: res.token,
        });

        setPaso('TU_QR');
      } catch (err: unknown) {
        if (err instanceof ExamQrError) {
          if (
            err.codigo === CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_FALLIDA ||
            err.codigo === CODIGOS_ERROR_QR_EXAMEN.SIN_ROSTRO
          ) {
            const nuevosIntentos =
              typeof err.intentosRestantes === 'number'
                ? err.intentosRestantes
                : Math.max(0, intentosRestantes - 1);

            setIntentosRestantes(nuevosIntentos);
            guardarIntentosExamen(examen.id, nuevosIntentos);

            if (nuevosIntentos <= 0) {
              setIntentosAgotados(true);
            }
            setErrorVerificacion(
              err.message || 'La foto no coincide con tu foto de perfil.',
            );
            setPaso('FALLO');
          } else if (
            err.codigo === CODIGOS_ERROR_QR_EXAMEN.VERIFICACION_INTENTOS_AGOTADOS
          ) {
            setIntentosRestantes(0);
            setIntentosAgotados(true);
            guardarIntentosExamen(examen.id, 0);
            setErrorVerificacion(err.message || 'Has agotado los 3 intentos de verificación.');
            setPaso('FALLO');
          } else if (
            err.codigo === CODIGOS_ERROR_QR_EXAMEN.ERROR_RED ||
            (typeof err.status === 'number' && err.status >= 500)
          ) {
            // Error de red no descuenta intentos (Criterio 13)
            setErrorVerificacion(
              'No pudimos conectarnos con el servidor. Revisa tu conexión a internet.',
            );
            setPaso('ERROR_RED');
          } else {
            setErrorVerificacion(err.message || 'Error al procesar la solicitud.');
            setPaso('FALLO');
          }
        } else {
          // Fallo general de red
          setErrorVerificacion(
            'No pudimos conectarnos con el servidor. Revisa tu conexión a internet.',
          );
          setPaso('ERROR_RED');
        }
      } finally {
        limpiarSelfieUrl();
        setIsSubmitting(false);
      }
    },
    [examen, intentosRestantes, onExamenActualizado, limpiarSelfieUrl],
  );

  // Tomar captura fotográfica de la cámara
  const capturarFoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Efecto espejo horizontal para selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob || !abierto.current) return;
        setSelfieBlob(blob);
        const url = URL.createObjectURL(blob); temporal.current=url;
        setSelfieUrl(url);
        detenerCamara();
        // Ejecuta inmediatamente la comparación (Mockup 2)
        void ejecutarGeneracionQr(blob);
      },
      'image/jpeg',
      0.9,
    );
  }, [detenerCamara, ejecutarGeneracionQr]);

  // Soporte de respaldo por archivo si el dispositivo no tiene cámara activa
  const handleArchivoRespaldo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieBlob(file);
    const url = URL.createObjectURL(file); temporal.current=url;
    setSelfieUrl(url);
    detenerCamara();
    void ejecutarGeneracionQr(file);
  };

  // Reintentar captura tras fallo
  const handleReintentar = useCallback(() => {
    limpiarSelfieUrl();
    setPaso('CAMARA');
    setTimeout(() => {
      iniciarCamara();
    }, 100);
  }, [limpiarSelfieUrl, iniciarCamara]);

  // Al abrir el modal o cambiar examen
  const examenId = examen?.id ?? null;
  const examenYaGenerado = examen?.estadoQr === 'GENERADO' && Boolean(examen?.qrUrl);

  useEffect(() => {
    if (!open || examenId === null) {
      detenerCamara();
      limpiarSelfieUrl();
      setIsSubmitting(false);
      return;
    }

    setQrVencidoEnVivo(false);
    setErrorVerificacion(null);

    // Cargar intentos persistidos para este examen
    const restantes = obtenerIntentosExamen(examenId);
    setIntentosRestantes(restantes);
    setIntentosAgotados(restantes <= 0);

    if (examenYaGenerado && examen?.qrUrl) {
      // Si el examen ya tiene el QR generado y vigente, mostrar directamente el QR
      setResultadoQr({
        qrUrl: examen.qrUrl,
        vigenteHasta: examen.qrVigenteHasta || examen.fechaFin,
        token: examen.token || undefined,
      });
      setPaso('TU_QR');
    } else if (restantes <= 0) {
      // Intentos agotados previamente para este examen
      setPaso('FALLO');
    } else {
      // En HU 23, la verificación con cámara es SIEMPRE requerida antes de generar QR
      setPaso('CAMARA');
      setTimeout(() => {
        iniciarCamara();
      }, 100);
    }
    // El estado de captura no debe reiniciar el modal ni abrir otra cámara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, examenId]);

  // Monitoreo de expiración en vivo del QR
  useEffect(() => {
    if (paso !== 'TU_QR' || !resultadoQr?.vigenteHasta) return;

    const revisarVigencia = () => {
      const finMs = new Date(resultadoQr.vigenteHasta).getTime();
      const ahora = Date.now();
      if (!isNaN(finMs) && ahora >= finMs) {
        setQrVencidoEnVivo(true);
      }
    };

    revisarVigencia();
    const interval = setInterval(revisarVigencia, 2000);
    return () => clearInterval(interval);
  }, [paso, resultadoQr]);

  // Descarga del QR como imagen PNG institucional de alta resolución
  const handleDescargarPng = () => {
    if (!examen || !resultadoQr || !qrCanvasRef.current) return;

    try {
      const canvas = qrCanvasRef.current;
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
      ctx.strokeStyle = '#0B1B3D';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      // Cabecera institucional
      ctx.fillStyle = '#0B1B3D';
      ctx.fillRect(16, 16, w - 32, 90);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('UNIVERSIDAD MAYOR DE SAN SIMÓN', w / 2, 54);
      ctx.font = '14px sans-serif';
      ctx.fillText('EXACONTROL · CREDENCIAL DE ACCESO AL EXAMEN', w / 2, 82);

      // Dibujar QR
      ctx.drawImage(canvas, (w - 260) / 2, 130, 260, 260);

      // Datos del estudiante
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(estudianteNombre, w / 2, 425);
      ctx.fillStyle = '#475569';
      ctx.font = '14px monospace';
      ctx.fillText(`SIS: ${estudianteSis} · ${examen.carrera}`, w / 2, 452);

      // Línea divisoria
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 480);
      ctx.lineTo(w - 80, 480);
      ctx.stroke();

      // Datos del examen
      ctx.fillStyle = '#0B1B3D';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(examen.nombre, w / 2, 515);

      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${examen.ambiente} · ${formatearFechaDdMmYyyy(examen.fechaInicio)}`, w / 2, 545);
      ctx.fillText(
        `Horario: ${formatearHora(examen.fechaInicio)} – ${formatearHora(examen.fechaFin)}`,
        w / 2,
        570,
      );

      // Banner de identidad verificada
      ctx.fillStyle = '#DCFCE7';
      ctx.fillRect(140, 605, w - 280, 44);
      ctx.strokeStyle = '#86EFAC';
      ctx.strokeRect(140, 605, w - 280, 44);
      ctx.fillStyle = '#15803D';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('✓ Identidad verificada', w / 2, 632);

      // Banner de vigencia
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(80, 665, w - 160, 48);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(80, 665, w - 160, 48);
      ctx.fillStyle = '#334155';
      ctx.font = '13px sans-serif';
      ctx.fillText(
        `Válido hasta las ${formatearHora(resultadoQr.vigenteHasta)} del ${formatearFechaDdMmYyyy(resultadoQr.vigenteHasta)}`,
        w / 2,
        695,
      );

      // Aviso legal
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Código personal e intransferible para control de ingreso.', w / 2, 765);

      const dataUrl = cardCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `QR-Examen-${examen.id}-${estudianteSis}.png`;
      a.click();
    } catch {
      // Ignorar fallo de exportación en entornos sin soporte
    }
  };

  if (!examen) return null;

  return (
    <Dialog open={open} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl"
        onEscapeKeyDown={onClose}
      >
        <DialogTitle className="sr-only">
          Verificación de identidad para examen {examen.nombre}
        </DialogTitle>

        {/* =========================================================================
            PANTALLA 1: CAPTURA DE FOTO CON CÁMARA (MOCKUP 1)
           ========================================================================= */}
        {paso === 'CAMARA' && (
          <div className="flex flex-col p-6 sm:p-7 gap-5">
            {/* Cabecera */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Verificación de identidad
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tómate una foto actual. Se comparará con tu foto de perfil.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Recuadro de la cámara con marco ovalado */}
            <div className="relative mx-auto flex h-64 sm:h-72 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#0f172a] shadow-inner">
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
                    <div className="max-w-xs space-y-2">
                      <p className="text-xs text-amber-200 font-medium">{camaraError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={iniciarCamara}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/30"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Reintentar cámara
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                      <span className="text-xs text-slate-300">Iniciando cámara...</span>
                    </div>
                  )}

                  {/* Fallback para subir foto si no hay cámara en el dispositivo */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    capture="user"
                    onChange={handleArchivoRespaldo}
                    className="hidden"
                  />
                  {camaraError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs text-slate-300 hover:text-white"
                    >
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                      O selecciona una foto de tu dispositivo
                    </Button>
                  )}
                </div>
              )}

              {/* Guía ovalada punteada centrada: Centra tu rostro en el óvalo */}
              {camaraActiva && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="h-44 w-36 sm:h-48 sm:w-40 rounded-[50%] border-2 border-dashed border-white/90 shadow-2xl" />
                  <span className="mt-2 text-[11px] font-medium text-white/90 bg-black/60 px-3 py-0.5 rounded-full backdrop-blur-xs">
                    Centra tu rostro en el óvalo
                  </span>
                </div>
              )}
            </div>

            {/* Caja de instrucciones: Para una buena foto */}
            <div className="rounded-xl border border-blue-100 bg-[#eff6ff] p-3.5 text-xs text-slate-700">
              <p className="font-bold text-slate-900">Para una buena foto</p>
              <ul className="mt-1 space-y-0.5 text-slate-600">
                <li>• Buena iluminación y rostro de frente</li>
                <li>• Sin gorra, lentes oscuros ni mascarilla</li>
              </ul>
            </div>

            {/* Nota de pie */}
            <p className="text-center text-xs text-slate-500">
              La selfie se procesa temporalmente para verificar tu identidad.
            </p>

            {/* Botones de acción */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-w-[120px] rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs h-10"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={capturarFoto}
                disabled={!camaraActiva}
                className="min-w-[150px] rounded-lg bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white font-semibold text-xs h-10 gap-2"
              >
                <Circle className="h-4 w-4 fill-current opacity-80" />
                Capturar foto
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PANTALLA 2: REVISAR FOTO & COMPARANDO (MOCKUP 2)
           ========================================================================= */}
        {paso === 'COMPARANDO' && (
          <div className="flex flex-col p-6 sm:p-7 gap-5">
            {/* Cabecera */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Verificación de identidad
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Revisa tu foto antes de continuar.
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cuadrícula de 2 columnas: Foto a la izquierda, Comparando a la derecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {/* Columna Izquierda: Foto capturada */}
              <div className="relative flex h-56 sm:h-64 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {selfieUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selfieUrl}
                    alt="Foto capturada"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Foto capturada</span>
                )}
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  Foto capturada
                </span>
              </div>

              {/* Columna Derecha: Tarjeta con spinner comparando */}
              <div className="flex h-56 sm:h-64 w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-xs">
                <Loader2 className="h-10 w-10 animate-spin text-[#0B1B3D]" />
                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  Comparando con tu foto de perfil...
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Esto puede tardar unos segundos
                </p>
              </div>
            </div>

            {/* Botones inferiores (bloqueados mientras se compara) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={true}
                  className="flex-1 rounded-lg border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold h-10 cursor-not-allowed"
                >
                  Repetir
                </Button>
                <Button
                  type="button"
                  disabled={true}
                  className="flex-1 rounded-lg bg-[#8b9bb4] text-white text-xs font-semibold h-10 cursor-not-allowed opacity-90"
                >
                  Confirmar y generar QR
                </Button>
              </div>
              <p className="text-center text-xs text-slate-400">
                Botones bloqueados mientras se compara.
              </p>
            </div>
          </div>
        )}

        {/* =========================================================================
            PANTALLA 3: TU QR DE INGRESO (MOCKUP 3)
           ========================================================================= */}
        {paso === 'TU_QR' && resultadoQr && (
          <div className="flex flex-col p-6 sm:p-7 gap-4">
            {/* Cabecera */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Tu QR de ingreso
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Presenta este código al controlador.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido centrado institucional */}
            <div className="flex flex-col items-center text-center">
              {/* Foto de perfil original del estudiante (circular) */}
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium">
                {fotoPerfilUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoPerfilUrl}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>Foto de perfil</span>
                )}
              </div>

              {/* Nombre y SIS */}
              <h3 className="mt-3 text-base font-bold text-slate-900">
                {estudianteNombre}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                SIS: {estudianteSis} · {examen.carrera}
              </p>

              {/* Divisor */}
              <div className="my-3 w-full border-t border-slate-200" />

              {/* Datos del examen */}
              <h4 className="text-sm font-bold text-slate-900">
                {examen.nombre}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {examen.ambiente} · {formatearFechaDdMmYyyy(examen.fechaInicio)} · {formatearHora(examen.fechaInicio)} – {formatearHora(examen.fechaFin)}
              </p>

              {/* Código QR con canvas */}
              <div className="relative my-3 flex items-center justify-center rounded-xl bg-white p-2">
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={resultadoQr.qrUrl}
                  size={190}
                  level="H"
                  includeMargin={true}
                />

                {qrVencidoEnVivo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-slate-900/85 p-3 text-center text-white backdrop-blur-xs">
                    <Clock className="h-8 w-8 text-amber-400 mb-1" />
                    <p className="text-xs font-bold">QR Vencido</p>
                    <p className="text-[11px] text-slate-300">
                      El examen finalizó a las {formatearHora(resultadoQr.vigenteHasta)}.
                    </p>
                  </div>
                )}
              </div>

              {/* Pill badge: Identidad verificada */}
              <div className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-4 py-1 text-xs font-semibold text-[#15803d]">
                Identidad verificada
              </div>

              {/* Validez */}
              <p className="mt-2 text-xs text-slate-500">
                Válido hasta las {formatearHora(resultadoQr.vigenteHasta)} del {formatearFechaDdMmYyyy(resultadoQr.vigenteHasta)}
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={handleDescargarPng}
                disabled={qrVencidoEnVivo}
                className="flex-1 rounded-lg bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white text-xs font-semibold h-10 gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar QR
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PANTALLA 4: NO PUDIMOS VERIFICAR TU IDENTIDAD (MOCKUP 4)
           ========================================================================= */}
        {paso === 'FALLO' && (
          <div className="flex flex-col p-6 sm:p-7 gap-5">
            {/* Cabecera */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  No pudimos verificar tu identidad
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  La foto no coincide con tu foto de perfil.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Banner de error rosado/rojo */}
            <div className="rounded-xl border border-red-200 bg-[#fef2f2] p-4 text-left">
              <p className="text-xs font-bold text-[#b91c1c]">La verificación falló</p>
              <p className="text-xs text-[#b91c1c] mt-0.5">
                {errorVerificacion || 'Intenta de nuevo con mejor luz y el rostro de frente.'}
              </p>
            </div>

            {/* Sección Intentos restantes con círculos */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-900">Intentos restantes</span>
              <div className="flex items-center gap-2">
                {/* 3 círculos:
                    Si falló 1 vez (quedan 2): circulo 1 rojo, 2 y 3 gris.
                    Si fallaron 2 veces (queda 1): circulo 1 y 2 rojo, 3 gris.
                    Si agotó intentos (quedan 0): 3 círculos rojos.
                */}
                <div
                  className={`h-4 w-4 rounded-full transition-colors ${
                    intentosRestantes <= 2 ? 'bg-[#ef4444]' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-4 w-4 rounded-full transition-colors ${
                    intentosRestantes <= 1 ? 'bg-[#ef4444]' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-4 w-4 rounded-full transition-colors ${
                    intentosRestantes <= 0 ? 'bg-[#ef4444]' : 'bg-slate-200'
                  }`}
                />
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {intentosRestantes} de 3
                </span>
              </div>
            </div>

            {/* Aviso para acudir al personal responsable */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left text-xs">
              <p className="font-semibold text-slate-800">
                Si agotas los intentos, acude al personal responsable.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                El caso se resuelve fuera del sistema.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                disabled={intentosAgotados || intentosRestantes <= 0}
                onClick={handleReintentar}
                className="flex-1 rounded-lg bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white text-xs font-semibold h-10 gap-2 disabled:bg-slate-300 disabled:text-slate-500"
              >
                <RotateCcw className="h-4 w-4" />
                {intentosAgotados || intentosRestantes <= 0 ? 'Intentos agotados' : 'Reintentar'}
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PANTALLA 5: ERROR DE RED / CONEXIÓN (CRITERIO 13)
           ========================================================================= */}
        {paso === 'ERROR_RED' && (
          <div className="flex flex-col p-6 sm:p-7 gap-5 text-center">
            <div className="flex items-start justify-between">
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Error de conexión
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  No pudimos conectarnos con el servidor.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-amber-200 bg-amber-50/60">
              <WifiOff className="h-10 w-10 text-amber-600" />
              <p className="text-xs font-medium text-amber-900">
                Ocurrió un problema de red. Revisa tu conexión a internet e inténtalo de nuevo.
              </p>
              <p className="text-[11px] text-amber-800/80">
                Nota: Este fallo de conexión no descuenta ninguno de tus 3 intentos.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10"
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (selfieBlob) {
                    void ejecutarGeneracionQr(selfieBlob);
                  } else {
                    handleReintentar();
                  }
                }}
                className="flex-1 rounded-lg bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white text-xs font-semibold h-10 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
