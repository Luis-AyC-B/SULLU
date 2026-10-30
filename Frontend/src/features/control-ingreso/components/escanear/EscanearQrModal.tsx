"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import type {
  ExamenAsignado,
  TipoExcepcionQr,
  EstudianteQrResultado,
} from "../../types/control-ingreso.types";
import { controlIngresoService } from "../../services/control-ingreso.service";
import { offlineIngresosService } from "../../services/offline-ingresos.service";
import { playSuccessChime } from "../../utils/audio-feedback";
import { QrViewfinder } from "./QrViewfinder";
import { QrSuccessCard } from "./QrSuccessCard";
import { QrExceptionDialog } from "./QrExceptionDialog";

interface EscanearQrModalProps {
  examen: ExamenAsignado;
  isOpen: boolean;
  onClose: () => void;
  onIngresoExitoso?: () => void;
  onAbrirRegistroManual: () => void;
}

export function EscanearQrModal({
  examen,
  isOpen,
  onClose,
  onIngresoExitoso,
  onAbrirRegistroManual,
}: EscanearQrModalProps) {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Estados de control de cámara
  const [cameraActiva, setCameraActiva] = useState(false);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [isVerificando, setIsVerificando] = useState(false);

  // Control de lecturas consecutivas (Task-9.2)
  const isProcessingRef = useRef(false);
  const lastScannedTokenRef = useRef<string>("");
  const cooldownUntilRef = useRef<number>(0);

  // Estados de retroalimentación
  const [estudianteExitoso, setEstudianteExitoso] =
    useState<EstudianteQrResultado | null>(null);

  // Estado de excepción activa
  const [excepcionActiva, setExcepcionActiva] = useState<{
    tipo: TipoExcepcionQr;
    estudiante?: EstudianteQrResultado;
    horaIngresoPrevio?: string;
    motivoInhabilitacion?: string;
    ambienteAsignado?: string;
    pendientesOffline?: number;
  } | null>(null);

  // Referencias mutables para evitar reinicios del stream por cambio de dependencias
  const excepcionActivaRef = useRef(excepcionActiva);
  excepcionActivaRef.current = excepcionActiva;

  const estudianteExitosoRef = useRef(estudianteExitoso);
  estudianteExitosoRef.current = estudianteExitoso;

  const onIngresoExitosoRef = useRef(onIngresoExitoso);
  onIngresoExitosoRef.current = onIngresoExitoso;

  // Contador reactivo de ingresos offline pendientes en IndexedDB
  const [pendientesOfflineCount, setPendientesOfflineCount] =
    useState<number>(0);

  useEffect(() => {
    if (isOpen && examen?.id) {
      controlIngresoService.cargarNominaCompletaExamen(examen.id).catch(() => {});
    }
  }, [isOpen, examen?.id]);

  useEffect(() => {
    const updateCount = () => {
      try {
        setPendientesOfflineCount(
          offlineIngresosService?.contarPendientesSync?.(examen.id) ?? 0
        );
      } catch {
        setPendientesOfflineCount(0);
      }
    };
    updateCount();
    if (typeof window !== "undefined") {
      window.addEventListener("sullu_offline_updated", updateCount);
      return () =>
        window.removeEventListener("sullu_offline_updated", updateCount);
    }
  }, [examen.id]);

  const handleSincronizarOffline = async () => {
    try {
      const res = await offlineIngresosService.sincronizarLote(examen.id);
      if (res.totalSincronizados > 0) {
        onIngresoExitosoRef.current?.();
      }
    } catch {
      // Si continúa sin conexión, se mantiene en cola en IndexedDB
    }
  };

  // Procesar código QR detectado (estable, no depende de estados transitorios)
  const procesarTokenQr = useCallback(
    async (token: string) => {
      const now = Date.now();
      let cleanToken = token.trim();
      if (!cleanToken) return;

      const matchUrl = cleanToken.match(/\/qr\/v\/([A-Za-z0-9\-_.]+)/i);
      if (matchUrl) {
        cleanToken = matchUrl[1];
      } else if (cleanToken.includes("token=")) {
        const matchParam = cleanToken.match(/[?&]token=([^&]+)/);
        if (matchParam) cleanToken = decodeURIComponent(matchParam[1]);
      }

      // Anti-rebote y prevención de lecturas duplicadas con el mismo QR
      if (isProcessingRef.current) return;
      if (excepcionActivaRef.current) return; // No procesar nuevos QRs si hay una excepción abierta
      if (estudianteExitosoRef.current) return; // Esperar a que concluyan los 1.5s de confirmación

      // Cooldown de 3.5 segundos si se mantiene el mismo QR frente a la cámara
      if (
        cleanToken === lastScannedTokenRef.current &&
        now < cooldownUntilRef.current
      ) {
        return;
      }

      isProcessingRef.current = true;
      lastScannedTokenRef.current = cleanToken;
      cooldownUntilRef.current = now + 3500;
      setIsVerificando(true);

      try {
        const resultado = await controlIngresoService.validarYRegistrarQr(
          examen.id,
          cleanToken,
          examen.ambiente
        );

        if (resultado.success && resultado.estudiante) {
          // CASO EXITOSO (Task-9.3)
          playSuccessChime();
          setEstudianteExitoso(resultado.estudiante);
          onIngresoExitosoRef.current?.();

          // Desaparecer automáticamente entre 1 y 2 segundos dejando el escáner abierto
          setTimeout(() => {
            setEstudianteExitoso(null);
            isProcessingRef.current = false;
          }, 1600);
        } else if (resultado.excepcion) {
          // EXCEPCIONES PERSISTENTES (Task-9.4)
          setExcepcionActiva({
            tipo: resultado.excepcion,
            estudiante: resultado.estudiante,
            horaIngresoPrevio: resultado.horaIngresoPrevio,
            motivoInhabilitacion: resultado.motivoInhabilitacion,
            ambienteAsignado: resultado.ambienteAsignado,
            pendientesOffline: resultado.pendientesOffline,
          });
          isProcessingRef.current = false;
        } else {
          // Si no hubo éxito ni excepción explícita, mostrar advertencia de QR no válido
          setExcepcionActiva({
            tipo: "QR_INVALIDO",
          });
          isProcessingRef.current = false;
        }
      } catch {
        setExcepcionActiva({
          tipo: "QR_INVALIDO",
        });
        isProcessingRef.current = false;
      } finally {
        setIsVerificando(false);
      }
    },
    [examen.id, examen.ambiente]
  );

  const procesarTokenQrRef = useRef(procesarTokenQr);
  procesarTokenQrRef.current = procesarTokenQr;

  // Detener la cámara y liberar el hardware
  const detenerCamara = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActiva(false);
    setIsVerificando(false);
  }, []);

  // Inicializar cámara y bucle de lectura continua (Cero dependencias dinámicas para evitar parpadeos)
  const iniciarCamara = useCallback(async () => {
    setPermisoDenegado(false);
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setPermisoDenegado(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActiva(true);
      }

      // Preparar detector nativo de códigos de barra si está soportado
      let barcodeDetector: {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
      } | null = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const DetectorClass = (
            window as unknown as {
              BarcodeDetector: new (opts: { formats: string[] }) => {
                detect: (s: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
              };
            }
          ).BarcodeDetector;
          barcodeDetector = new DetectorClass({
            formats: ["qr_code"],
          });
        } catch {
          barcodeDetector = null;
        }
      }

      // Bucle de detección continuo en frames de video (con fallback universal a jsQR)
      let lastScanTime = 0;
      const scanFrame = async (timestamp: number) => {
        if (!videoRef.current || !streamRef.current) return;

        // Escanear cada ~150ms para no saturar CPU y mantener fluidez a 60fps
        if (
          timestamp - lastScanTime > 150 &&
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
          !isProcessingRef.current &&
          !excepcionActivaRef.current &&
          !estudianteExitosoRef.current
        ) {
          lastScanTime = timestamp;
          try {
            let detectedToken: string | null = null;

            // 1. Probar BarcodeDetector nativo si está disponible
            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedToken = barcodes[0].rawValue;
                }
              } catch {
                // Continuar a jsQR
              }
            }

            // 2. Fallback universal usando jsQR y canvas para máxima compatibilidad
            if (!detectedToken && canvasRef.current && videoRef.current) {
              const canvas = canvasRef.current;
              const video = videoRef.current;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                // Escalar canvas a resolución óptima para escaneo veloz
                const scale = Math.min(1, 640 / video.videoWidth);
                canvas.width = Math.floor(video.videoWidth * scale);
                canvas.height = Math.floor(video.videoHeight * scale);
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                  });
                  if (code && code.data) {
                    detectedToken = code.data;
                  }
                }
              }
            }

            if (detectedToken) {
              await procesarTokenQrRef.current(detectedToken);
            }
          } catch {
            // Ignorar errores puntuales entre frames
          }
        }

        animFrameRef.current = requestAnimationFrame(scanFrame);
      };

      animFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setPermisoDenegado(true);
      } else {
        setCameraActiva(true);
      }
    }
  }, []);

  // Manejo del ciclo de vida de la ventana modal (permanece activa sin apagarse)
  useEffect(() => {
    if (isOpen) {
      iniciarCamara();
    } else {
      detenerCamara();
      setEstudianteExitoso(null);
      setExcepcionActiva(null);
      isProcessingRef.current = false;
      lastScannedTokenRef.current = "";
    }

    return () => {
      detenerCamara();
    };
  }, [isOpen, iniciarCamara, detenerCamara]);

  if (!isOpen) return null;

  // Acciones de las excepciones
  const handleContinuarExcepcion = () => {
    setExcepcionActiva(null);
    isProcessingRef.current = false;
    cooldownUntilRef.current = Date.now() + 1000;
  };

  const handleRegistrarIncidencia = () => {
    const codSis = excepcionActiva?.estudiante?.codSis || "";
    const nombre = excepcionActiva?.estudiante?.nombre || "";
    detenerCamara();
    onClose();
    router.push(
      `/ingresos-rechazados?examenId=${examen.id}&codSis=${encodeURIComponent(
        codSis
      )}&nombre=${encodeURIComponent(nombre)}`
    );
  };

  const handleIrARegistroManual = () => {
    detenerCamara();
    onClose();
    onAbrirRegistroManual();
  };

  const handleSeleccionarArchivoQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            void procesarTokenQr(code.data);
          } else {
            toast.error("No se detectó ningún código QR en la imagen seleccionada");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#0E131F] flex flex-col w-full h-full text-white animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 1. Header superior que cubre el header del dashboard (estilo aplicación nativa) */}
      <div className="flex items-center justify-between px-5 py-4 z-20 shrink-0 bg-[#0E131F] border-b border-slate-800/80 shadow-md">
        <h3 className="text-lg font-bold text-white tracking-tight">
          Escanear código QR
        </h3>
        <div className="flex items-center gap-2">
          <label
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer transition-colors"
            title="Subir archivo o captura con código QR"
          >
            <Upload className="h-4 w-4" />
            <span>Subir imagen QR</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleSeleccionarArchivoQr}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer active:scale-95"
            aria-label="Cerrar escáner"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* 2. Contenido principal a pantalla completa: Visor de cámara fluido */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <QrViewfinder
          examen={examen}
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraActiva={cameraActiva && !permisoDenegado}
          pendientesCount={pendientesOfflineCount}
          onSincronizar={handleSincronizarOffline}
          isVerificando={isVerificando}
        />

        {/* Confirmación verde de 1 a 2 segundos (Mockup 2) */}
        {estudianteExitoso && <QrSuccessCard estudiante={estudianteExitoso} />}
      </div>

      {/* Modal de Excepción Activa (Mockups 1, 3, 4, 5) */}
      {excepcionActiva && (
        <QrExceptionDialog
          excepcion={excepcionActiva.tipo}
          estudiante={excepcionActiva.estudiante}
          horaIngresoPrevio={excepcionActiva.horaIngresoPrevio}
          motivoInhabilitacion={excepcionActiva.motivoInhabilitacion}
          ambienteAsignado={excepcionActiva.ambienteAsignado}
          ambienteActual={examen.ambiente}
          pendientesOffline={excepcionActiva.pendientesOffline}
          onContinuar={handleContinuarExcepcion}
          onRegistrarIncidencia={handleRegistrarIncidencia}
          onAbrirRegistroManual={handleIrARegistroManual}
        />
      )}

      {/* Modal de Permiso Denegado */}
      {permisoDenegado && (
        <QrExceptionDialog
          excepcion="CAMARA_DENEGADA"
          onContinuar={() => setPermisoDenegado(false)}
          onRegistrarIncidencia={handleRegistrarIncidencia}
          onAbrirRegistroManual={handleIrARegistroManual}
          onReintentarPermiso={iniciarCamara}
        />
      )}
    </div>
  );
}
