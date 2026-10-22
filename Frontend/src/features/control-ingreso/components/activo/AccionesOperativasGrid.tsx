"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Lock, Search, AlertTriangle, ArrowRight } from "lucide-react";
import { useDeviceCapabilities } from "../../hooks/useDeviceCapabilities";
import { toast } from "sonner";

interface AccionesOperativasGridProps {
  onAbrirRegistroManual?: () => void;
  onAbrirScanner?: () => void;
}

export function AccionesOperativasGrid({
  onAbrirRegistroManual,
  onAbrirScanner,
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

  const handleEscanearQr = () => {
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
      {/* Grid de 2 Tarjetas Principales: Escanear QR y Registro Manual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tarjeta 1: Escanear QR (Adaptativa por Dispositivo y RBAC) */}
        <div
          className={`rounded-2xl p-6 text-left transition-all border flex flex-col justify-between ${
            canEscanearQr
              ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs cursor-pointer"
              : "bg-slate-50/70 border-slate-200/80 cursor-default"
          }`}
          onClick={canEscanearQr ? handleEscanearQr : undefined}
        >
          <div>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${
                canEscanearQr
                  ? "bg-blue-50 text-[#002D62]"
                  : "bg-slate-200/60 text-slate-400"
              }`}
            >
              {canEscanearQr ? (
                <Camera className="h-6 w-6" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>

            <h3
              className={`text-lg font-bold mb-1.5 ${
                canEscanearQr ? "text-slate-900" : "text-slate-700"
              }`}
            >
              Escanear QR
            </h3>

            {!canEscanearQr ? (
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                No dispones del permiso necesario para escanear códigos QR.
              </p>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Apunta la cámara al código QR del estudiante para registrar su ingreso en tiempo real.
              </p>
            )}
          </div>

          <div className="pt-2">
            {!canEscanearQr ? (
              <span className="text-xs font-medium text-slate-400 select-none">
                Permiso no asignado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEscanearQr}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#002D62] hover:underline underline-offset-4 cursor-pointer"
              >
                <span>Abrir cámara</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tarjeta 2: Registrar ingreso manual (RBAC) */}
        <div
          onClick={canRegistroManual ? handleRegistroManual : undefined}
          className={`rounded-2xl p-6 text-left transition-all border flex flex-col justify-between ${
            canRegistroManual
              ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs cursor-pointer"
              : "bg-slate-50/70 border-slate-200/80 cursor-default"
          }`}
        >
          <div>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${
                canRegistroManual
                  ? "bg-blue-50 text-[#002D62]"
                  : "bg-slate-200/60 text-slate-400"
              }`}
            >
              {canRegistroManual ? (
                <Search className="h-6 w-6" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>

            <h3
              className={`text-lg font-bold mb-1.5 ${
                canRegistroManual ? "text-slate-900" : "text-slate-700"
              }`}
            >
              Registrar ingreso manual
            </h3>

            <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-4">
              {canRegistroManual
                ? "Busca por código SIS, CI o nombre y verifica los datos antes de registrar."
                : "No dispones del permiso necesario para registrar ingresos manualmente."}
            </p>
          </div>

          <div className="pt-2">
            {canRegistroManual ? (
              <button
                type="button"
                onClick={handleRegistroManual}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#002D62] hover:underline underline-offset-4 cursor-pointer"
              >
                <span>Buscar estudiante</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-400 select-none">
                Permiso no asignado
              </span>
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
            <h4 className="text-sm md:text-base font-bold text-slate-900 truncate">
              ¿Ocurrió una incidencia?
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
