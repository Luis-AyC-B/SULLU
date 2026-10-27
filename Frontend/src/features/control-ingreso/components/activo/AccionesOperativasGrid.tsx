"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Lock, Search, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import type { ExamenAsignado } from "../../types/control-ingreso.types";
import { useDeviceCapabilities } from "../../hooks/useDeviceCapabilities";
import { toast } from "sonner";

interface AccionesOperativasGridProps {
  onAbrirRegistroManual?: () => void;
  onAbrirScanner?: () => void;
  examen?: ExamenAsignado;
}

export function AccionesOperativasGrid({
  onAbrirRegistroManual,
  onAbrirScanner,
  examen,
}: AccionesOperativasGridProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { canScanQr, helperText } = useDeviceCapabilities();

  const permisos = (session?.user?.permisos as string[]) || [];

  const canEscanearQr =
    permisos.length === 0 || // Desarrollo / fallback inicial
    permisos.some(
      (p) =>
        p === "control_ingreso.escanear_qr" ||
        p === "control_ingreso" ||
        p === "usuarios.crear"
    );

  const canRegistroManual =
    permisos.length === 0 || // Desarrollo / fallback inicial
    permisos.some(
      (p) =>
        p === "control_ingreso.registro_manual" ||
        p === "control_ingreso" ||
        p === "usuarios.crear"
    );

  const isProximo = examen?.estado === "PROXIMO";
  const isFinalizado = examen?.estado === "FINALIZADO";
  const isHorarioPermitido = !examen || (!isProximo && !isFinalizado);
  const canEscanearQrVisual = canEscanearQr && isHorarioPermitido;
  const canRegistroManualVisual = canRegistroManual && isHorarioPermitido;

  const handleEscanearQr = () => {
    if (isProximo) {
      toast.info(
        `El registro de ingreso se habilitará 15 minutos antes del inicio del examen (${examen?.horario || ""}).`
      );
      return;
    }
    if (isFinalizado) {
      toast.error("El examen ya ha finalizado. No se permiten nuevos ingresos.");
      return;
    }
    if (!canEscanearQr) {
      toast.error("No tienes permiso para escanear códigos QR");
      return;
    }
    if (!canScanQr) {
      toast.info(helperText);
      return;
    }
    if (onAbrirScanner) {
      onAbrirScanner();
      return;
    }
    router.push("/control-ingreso/escanear");
  };

  const handleRegistroManual = () => {
    if (isProximo) {
      toast.info(
        `El registro de ingreso se habilitará 15 minutos antes del inicio del examen (${examen?.horario || ""}).`
      );
      return;
    }
    if (isFinalizado) {
      toast.error("El examen ya ha finalizado. No se permiten nuevos ingresos.");
      return;
    }
    if (!canRegistroManual) {
      toast.error("No tienes permiso para registrar ingresos manuales");
      return;
    }
    if (onAbrirRegistroManual) {
      onAbrirRegistroManual();
      return;
    }
    // Fallback a ruta
    router.push("/control-ingreso/manual");
  };

  const handleRegistrarIncidencia = () => {
    // Módulo de incidencias
    router.push("/incidencias");
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {isProximo && (
        <div className="w-full rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 flex items-center gap-3 text-xs text-amber-900 font-medium">
          <Clock className="h-4 w-4 text-amber-700 shrink-0" />
          <span>
            <strong>Examen próximo:</strong> El registro de ingreso se habilitará automáticamente <strong>15 minutos antes</strong> del inicio del examen ({examen?.horario}).
          </span>
        </div>
      )}
      {isFinalizado && (
        <div className="w-full rounded-2xl bg-slate-100 border border-slate-200/90 p-4 flex items-center gap-3 text-xs text-slate-700 font-medium">
          <Clock className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            <strong>Examen finalizado:</strong> El periodo de registro de ingreso para este examen ha concluido.
          </span>
        </div>
      )}

      {/* Grid de 2 Tarjetas Principales: Escanear QR y Registro Manual */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* Tarjeta 1: Escanear QR (Adaptativa por Dispositivo y RBAC) */}
        <div
          className={`rounded-2xl p-4 md:p-6 text-left transition-all border flex flex-col justify-between ${
            canEscanearQrVisual
              ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs cursor-pointer"
              : "bg-slate-50/70 border-slate-200/80 cursor-default"
          }`}
          onClick={canEscanearQr ? handleEscanearQr : undefined}
        >
          <div>
            <div
              className={`flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl mb-3 md:mb-4 ${
                canEscanearQrVisual
                  ? "bg-blue-50 text-[#002D62]"
                  : "bg-slate-200/60 text-slate-400"
              }`}
            >
              {canEscanearQr ? (
                <Camera className="h-5 w-5 md:h-6 md:w-6" />
              ) : (
                <Lock className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </div>

            <h3
              className={`text-sm md:text-lg font-bold mb-1 md:mb-1.5 ${
                canEscanearQrVisual ? "text-slate-900" : "text-slate-700"
              }`}
            >
              Escanear QR
            </h3>

            {isProximo ? (
              <p className="hidden md:block text-xs text-amber-700 font-medium leading-relaxed mb-4">
                El ingreso se habilitará 15 minutos antes del examen ({examen?.horario}).
              </p>
            ) : isFinalizado ? (
              <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
                El examen ha finalizado. No se admiten nuevos registros.
              </p>
            ) : !canEscanearQr ? (
              <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
                No dispones del permiso necesario para escanear códigos QR.
              </p>
            ) : (
              <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
                Apunta la cámara al código QR del estudiante para registrar su ingreso en tiempo real.
              </p>
            )}
          </div>

          <div className="pt-1 md:pt-2">
            {!isHorarioPermitido ? (
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg select-none">
                {isProximo ? "Habilitado -15 min" : "Finalizado"}
              </span>
            ) : !canEscanearQr ? (
              <span className="text-xs font-medium text-slate-400 select-none">
                Permiso no asignado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEscanearQr}
                className="inline-flex items-center gap-1 md:gap-1.5 text-xs md:text-sm font-bold text-[#002D62] hover:underline underline-offset-4 cursor-pointer"
              >
                <span>Abrir cámara</span>
                <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tarjeta 2: Registrar ingreso manual (RBAC) */}
        <div
          onClick={canRegistroManual ? handleRegistroManual : undefined}
          className={`rounded-2xl p-4 md:p-6 text-left transition-all border flex flex-col justify-between ${
            canRegistroManualVisual
              ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs cursor-pointer"
              : "bg-slate-50/70 border-slate-200/80 cursor-default"
          }`}
        >
          <div>
            <div
              className={`flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl mb-3 md:mb-4 ${
                canRegistroManualVisual
                  ? "bg-blue-50 text-[#002D62]"
                  : "bg-slate-200/60 text-slate-400"
              }`}
            >
              {canRegistroManual ? (
                <Search className="h-5 w-5 md:h-6 md:w-6" />
              ) : (
                <Lock className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </div>

            <h3
              className={`text-sm md:text-lg font-bold mb-1 md:mb-1.5 ${
                canRegistroManualVisual ? "text-slate-900" : "text-slate-700"
              }`}
            >
              Registro manual
            </h3>

            {isProximo ? (
              <p className="hidden md:block text-xs text-amber-700 font-medium leading-relaxed mb-4">
                El ingreso se habilitará 15 minutos antes del examen ({examen?.horario}).
              </p>
            ) : isFinalizado ? (
              <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
                El examen ha finalizado. No se admiten nuevos registros.
              </p>
            ) : !canRegistroManual ? (
              <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
                No dispones del permiso necesario para registrar ingresos manualmente.
              </p>
            ) : (
              <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
                Busca por código SIS, CI o nombre y verifica los datos antes de registrar.
              </p>
            )}
          </div>

          <div className="pt-1 md:pt-2">
            {!isHorarioPermitido ? (
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg select-none">
                {isProximo ? "Habilitado -15 min" : "Finalizado"}
              </span>
            ) : !canRegistroManual ? (
              <span className="text-xs font-medium text-slate-400 select-none">
                Permiso no asignado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRegistroManual}
                className="inline-flex items-center gap-1 md:gap-1.5 text-xs md:text-sm font-bold text-[#002D62] hover:underline underline-offset-4 cursor-pointer"
              >
                <span>Buscar</span>
                <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta 3: ¿Ocurrió una incidencia? */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm md:text-base font-bold text-slate-900">
              <span className="md:hidden">¿Incidencia?</span>
              <span className="hidden md:inline">¿Ocurrió una incidencia?</span>
            </h4>
            <p className="hidden md:block text-xs text-slate-500 mt-0.5">
              Deja constancia de problemas de identificación, acceso o
              ambiente.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegistrarIncidencia}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs md:text-sm font-semibold text-slate-700 transition-colors shrink-0 shadow-2xs cursor-pointer active:scale-95"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>Registrar</span>
        </button>
      </div>
    </div>
  );
}
