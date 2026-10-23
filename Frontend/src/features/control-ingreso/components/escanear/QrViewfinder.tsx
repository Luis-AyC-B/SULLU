"use client";

import { RefObject } from "react";
import { RotateCw, Loader2 } from "lucide-react";
import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface QrViewfinderProps {
  examen: ExamenAsignado;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cameraActiva: boolean;
  pendientesCount?: number;
  onSincronizar?: () => void;
  isVerificando?: boolean;
}

export function QrViewfinder({
  examen,
  videoRef,
  canvasRef,
  cameraActiva,
  pendientesCount = 0,
  onSincronizar,
  isVerificando = false,
}: QrViewfinderProps) {
  return (
    <div className="relative w-full flex-1 min-h-0 bg-[#0E131F] overflow-hidden flex flex-col justify-between p-5">
      {/* 1. Elemento de Video para la cámara física */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Canvas oculto para decodificación de fotogramas con jsQR */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capa de oscurecimiento suave para legibilidad */}
      <div className="absolute inset-0 bg-slate-950/25 pointer-events-none z-1" />

      {/* 2. Encabezado superior dentro del visor: Asignatura, Sala y Badge "Cámara activa" */}
      <div className="relative z-10 flex items-start justify-between gap-3 w-full">
        <div className="min-w-0">
          <h4 className="text-white font-extrabold text-base tracking-tight truncate">
            {examen.asignatura}
          </h4>
          <p className="text-slate-300 text-xs font-medium mt-0.5">
            {examen.ambiente}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendientesCount !== undefined && pendientesCount > 0 && (
            <button
              type="button"
              onClick={onSincronizar}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/95 hover:bg-amber-600 text-white text-xs font-bold shrink-0 shadow-xs transition-colors cursor-pointer active:scale-95 border border-amber-400/40"
              title="Sincronizar ingresos pendientes"
            >
              <RotateCw className="h-3 w-3" />
              <span>
                {pendientesCount} pendiente{pendientesCount === 1 ? "" : "s"}
              </span>
            </button>
          )}

          {cameraActiva && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E6F4EA] text-[#137333] text-xs font-bold shrink-0 shadow-xs border border-emerald-300/40 animate-in fade-in duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#137333] animate-pulse" />
              <span>Cámara activa</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Marco de Escaneo con esquinas redondeadas y rayo láser animado */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center py-4">
        <div className="relative w-64 h-72 sm:w-72 sm:h-80 flex items-center justify-center overflow-hidden rounded-2xl">
          {/* Esquina Superior Izquierda */}
          <div
            className={`absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-2xl pointer-events-none transition-colors duration-200 ${
              isVerificando ? "border-amber-400 shadow-[0_0_10px_#f59e0b]" : "border-white"
            }`}
          />

          {/* Esquina Superior Derecha */}
          <div
            className={`absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-2xl pointer-events-none transition-colors duration-200 ${
              isVerificando ? "border-amber-400 shadow-[0_0_10px_#f59e0b]" : "border-white"
            }`}
          />

          {/* Esquina Inferior Izquierda */}
          <div
            className={`absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-2xl pointer-events-none transition-colors duration-200 ${
              isVerificando ? "border-amber-400 shadow-[0_0_10px_#f59e0b]" : "border-white"
            }`}
          />

          {/* Esquina Inferior Derecha */}
          <div
            className={`absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-2xl pointer-events-none transition-colors duration-200 ${
              isVerificando ? "border-amber-400 shadow-[0_0_10px_#f59e0b]" : "border-white"
            }`}
          />

          {/* Línea Láser roja escaneando suavemente de arriba a abajo */}
          {cameraActiva && !isVerificando && (
            <div
              className="absolute inset-x-2 h-[3px] bg-red-500 shadow-[0_0_14px_#ef4444] rounded-full pointer-events-none"
              style={{
                animation: "laserScan 2.2s ease-in-out infinite alternate",
              }}
            />
          )}

          {/* Indicador de verificación en proceso */}
          {isVerificando && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white animate-in fade-in duration-150">
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
              <span className="text-xs font-bold tracking-wide text-amber-200">
                Verificando...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Pie de Visor: Guía visual y estado de lectura para el usuario */}
      <div className="relative z-10 text-center pb-2">
        {isVerificando ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 text-amber-300 text-xs font-bold shadow-lg border border-amber-500/30">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Consultando nómina y validez del QR...</span>
          </div>
        ) : (
          <p className="text-white/90 text-xs font-medium tracking-wide bg-slate-950/60 px-4 py-1.5 rounded-full inline-block backdrop-blur-xs">
            Apunta la cámara al código QR del estudiante
          </p>
        )}
      </div>

      {/* Animación del rayo láser en CSS puro */}
      <style jsx>{`
        @keyframes laserScan {
          0% {
            top: 5%;
            opacity: 0.85;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 95%;
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}
