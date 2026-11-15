"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import type {
  ExamenAsignado,
  TipoExcepcionQr,
  EstudianteQrResultado,
  EstudianteBusquedaItem,
  MiGrupoControlador,
} from "../../types/control-ingreso.types";
import { controlIngresoService } from "../../services/control-ingreso.service";
import { offlineIngresosService } from "../../services/offline-ingresos.service";
import { playSuccessChime } from "../../utils/audio-feedback";
import { QrViewfinder } from "./QrViewfinder";
import { QrExceptionDialog } from "./QrExceptionDialog";
import { ConfirmarIngresoStep } from "../manual/ConfirmarIngresoStep";

interface EscanearQrModalProps {
  examen: ExamenAsignado;
  isOpen: boolean;
  onClose: () => void;
  onIngresoExitoso?: () => void;
  onAbrirRegistroManual: () => void;
  /** HU17: Grupo asignado al controlador (null si no tiene partición) */
  miGrupo?: MiGrupoControlador | null;
}

export function EscanearQrModal({
  examen,
  isOpen,
  onClose,
  onIngresoExitoso,
  onAbrirRegistroManual,
  miGrupo,
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

  // Adaptador de EstudianteQrResultado → EstudianteBusquedaItem para ConfirmarIngresoStep
  const estudianteQrABusqueda = (
    qr: EstudianteQrResultado,
  ): EstudianteBusquedaItem => ({
    id: qr.id ?? 0,
    codSis: qr.codSis,
    ci: "",
    nombre: qr.nombre,
    apellido: qr.apellido,
    estadoHabilitado: qr.estadoHabilitado ?? true,
    motivoInhabilitacion: qr.motivoInhabilitacion,
    ambienteAsignado: qr.ambienteAsignado ?? "",
    yaIngreso: qr.yaIngreso ?? false,
    horaIngresoPrevio: qr.horaIngresoPrevio,
  });

  // Estado de confirmación QR (reemplaza QrSuccessCard)
  const [estudiantePendienteConfirmar, setEstudiantePendienteConfirmar] =
    useState<EstudianteBusquedaItem | null>(null);
  const [isConfirmandoQr, setIsConfirmandoQr] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | null>(null);
  const tokenPendienteRef = useRef<string>("");

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

  const estudiantePendienteRef = useRef(estudiantePendienteConfirmar);
  estudiantePendienteRef.current = estudiantePendienteConfirmar;

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
      if (estudiantePendienteRef.current) return; // Esperar confirmación del modal

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
          cleanToken
        );

        if (resultado.success && resultado.estudiante) {
          // QR VÁLIDO → mostrar modal de confirmación (reutilizar ConfirmarIngresoStep)
          playSuccessChime();
          tokenPendienteRef.current = cleanToken;
          setErrorConfirmacion(null);
          setEstudiantePendienteConfirmar(estudianteQrABusqueda(resultado.estudiante));
          // isProcessingRef.current permanece true hasta que el usuario confirme o cancele
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
    [examen.id]
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
          !estudiantePendienteRef.current
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
      setEstudiantePendienteConfirmar(null);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#0E131F] flex flex-col w-full h-full text-white animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 1. Header superior que cubre el header del dashboard (estilo aplicación nativa) */}
      <div className="flex items-center justify-between px-5 py-4 z-20 shrink-0 bg-[#0E131F] border-b border-slate-800/80 shadow-md">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Escanear código QR
          </h3>
          {/* HU17: indicador compacto del rango asignado */}
          {miGrupo && (
            <span className="text-xs font-semibold text-blue-300">
              Fila asignada:{" "}
              <span className="text-white font-bold">{miGrupo.rango}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Modal de Confirmación QR (reutiliza la misma estructura y diseño de ConfirmarIngresoStep) */}
      {estudiantePendienteConfirmar && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-55 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEstudiantePendienteConfirmar(null);
              setErrorConfirmacion(null);
              isProcessingRef.current = false;
            }
          }}
        >
          <div className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-5 md:p-7 flex flex-col max-h-[92vh] md:max-h-[85vh] relative animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
            {/* Barra táctil indicadora en mobile */}
            <div className="block md:hidden h-1 w-12 rounded-full bg-slate-200 mx-auto mb-3 shrink-0" />

            {/* Encabezado con Título y Botón Cerrar */}
            <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-slate-900">
                Confirmar ingreso
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEstudiantePendienteConfirmar(null);
                  setErrorConfirmacion(null);
                  isProcessingRef.current = false;
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Cerrar ventana"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cuerpo con ConfirmarIngresoStep */}
            <div className="overflow-y-auto flex-1 pr-0.5 py-1">
              <ConfirmarIngresoStep
                estudiante={estudiantePendienteConfirmar}
                examen={examen}
                miGrupo={miGrupo}
                textoVolver="Volver a escanear"
                isSubmitting={isConfirmandoQr}
                errorEnvio={errorConfirmacion}
                onVolver={() => {
                  setEstudiantePendienteConfirmar(null);
                  setErrorConfirmacion(null);
                  isProcessingRef.current = false;
                }}
                onCancelar={() => {
                  setEstudiantePendienteConfirmar(null);
                  setErrorConfirmacion(null);
                  isProcessingRef.current = false;
                }}
                onConfirmar={async () => {
                  setIsConfirmandoQr(true);
                  setErrorConfirmacion(null);
                  try {
                    const res = await controlIngresoService.confirmarIngresoQr(
                      examen.id,
                      tokenPendienteRef.current
                    );
                    if (res.success === false && res.excepcion) {
                      setEstudiantePendienteConfirmar(null);
                      setExcepcionActiva({
                        tipo: res.excepcion,
                        estudiante: res.estudiante,
                      });
                    } else {
                      setEstudiantePendienteConfirmar(null);
                      onIngresoExitosoRef.current?.();
                      toast.success("Ingreso registrado exitosamente");
                    }
                  } catch {
                    setErrorConfirmacion("No se pudo confirmar el ingreso. Intenta nuevamente.");
                  } finally {
                    setIsConfirmandoQr(false);
                    isProcessingRef.current = false;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

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
