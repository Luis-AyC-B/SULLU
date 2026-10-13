"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  ExamenAsignado,
  TipoExcepcionQr,
  EstudianteQrResultado,
} from "../../types/control-ingreso.types";
import { controlIngresoService } from "../../services/control-ingreso.service";
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

  // Estados de control
  const [cameraActiva, setCameraActiva] = useState(false);
  const [permisoDenegado, setPermisoDenegado] = useState(false);

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

  // Detener la cámara
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
  }, []);

  // Procesar código QR detectado
  const procesarTokenQr = useCallback(
    async (token: string) => {
      const now = Date.now();
      const cleanToken = token.trim();
      if (!cleanToken) return;

      // Anti-rebote y prevención de lecturas duplicadas con el mismo QR (Task-9.2)
      if (isProcessingRef.current) return;
      if (excepcionActiva) return; // No procesar nuevos QRs si hay una excepción abierta
      if (estudianteExitoso) return; // Esperar a que concluyan los 1.5s de confirmación

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

      try {
        const resultado = await controlIngresoService.validarYRegistrarQr(
          examen.id,
          cleanToken,
          examen.ambiente
        );

        if (resultado.success && resultado.estudiante) {
          // CASO EXITOSO (Task-9.3)
          // 1. Emitir señal sonora y háptica
          playSuccessChime();

          // 2. Mostrar tarjeta verde con datos
          setEstudianteExitoso(resultado.estudiante);

          // 3. Notificar actualización de resumen en vivo
          onIngresoExitoso?.();

          // 4. Desaparecer automáticamente entre 1 y 2 segundos (1.5s) dejando el escáner abierto
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
        }
      } catch {
        setExcepcionActiva({
          tipo: "QR_INVALIDO",
        });
        isProcessingRef.current = false;
      }
    },
    [examen.id, examen.ambiente, excepcionActiva, estudianteExitoso, onIngresoExitoso]
  );

  // Inicializar cámara y bucle de lectura continua
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
      let barcodeDetector: any = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
        } catch {
          barcodeDetector = null;
        }
      }

      // Bucle de detección continuo en frames de video
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;

        if (
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
          !isProcessingRef.current &&
          !excepcionActiva &&
          !estudianteExitoso
        ) {
          try {
            if (barcodeDetector) {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                await procesarTokenQr(barcodes[0].rawValue);
              }
            }
          } catch {
            // Ignorar errores puntuales entre cuadros
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
        // En navegadores de escritorio sin webcam física (NotFoundError) o entornos de desarrollo,
        // mantenemos activo el visor visual con los botones de simulación interactiva
        setCameraActiva(true);
      }
    }
  }, [excepcionActiva, estudianteExitoso, procesarTokenQr]);

  // Manejo del ciclo de vida de la ventana modal
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
    // Redirigir a Incidencias con parámetros de contexto
    router.push(
      `/incidencias?examenId=${examen.id}&codSis=${encodeURIComponent(
        codSis
      )}&nombre=${encodeURIComponent(nombre)}`
    );
  };

  const handleIrARegistroManual = () => {
    detenerCamara();
    onClose();
    onAbrirRegistroManual();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#0E131F] flex flex-col w-full h-full text-white animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 1. Header superior que tapa el header del dashboard (como en Yape) */}
      <div className="flex items-center justify-between px-5 py-4 z-20 shrink-0 bg-[#0E131F] border-b border-slate-800/80 shadow-md">
        <h3 className="text-lg font-bold text-white tracking-tight">
          Escanear código QR
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer active:scale-95"
          aria-label="Cerrar escáner"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* 2. Contenido principal a pantalla completa: Visor de cámara */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <QrViewfinder
          examen={examen}
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraActiva={cameraActiva && !permisoDenegado}
        />

        {/* Confirmación verde de 1 a 2 segundos (Mockup 2) */}
        {estudianteExitoso && <QrSuccessCard estudiante={estudianteExitoso} />}
      </div>

      {/* 3. Barra de Simulación en la parte inferior de la pantalla */}
      <div className="z-20 px-3 py-3 bg-slate-950/95 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-1 overflow-x-auto max-w-lg mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 flex items-center gap-1 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Simular:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => procesarTokenQr("202110234")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer active:scale-95"
            >
              Válido (Valentina)
            </button>
            <button
              type="button"
              onClick={() => procesarTokenQr("202008711")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer active:scale-95"
            >
              Ya registrado (Andrés)
            </button>
            <button
              type="button"
              onClick={() => procesarTokenQr("202211582")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer active:scale-95"
            >
              No habilitado (Mariana)
            </button>
            <button
              type="button"
              onClick={() => procesarTokenQr("202005819")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors cursor-pointer active:scale-95"
            >
              Otro ambiente (Carlos)
            </button>
            <button
              type="button"
              onClick={() => procesarTokenQr("codigo-invalido-xyz")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-white hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
            >
              Inválido
            </button>
          </div>
        </div>
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

      {/* Modal de Permiso Denegado (Task-9.7) */}
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
