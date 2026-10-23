"use client";

import {
  X,
  Clock,
  LayoutGrid,
  MapPin,
  CameraOff,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import type {
  TipoExcepcionQr,
  EstudianteQrResultado,
} from "../../types/control-ingreso.types";

interface QrExceptionDialogProps {
  excepcion: TipoExcepcionQr;
  estudiante?: EstudianteQrResultado;
  horaIngresoPrevio?: string;
  motivoInhabilitacion?: string;
  ambienteAsignado?: string;
  ambienteActual?: string;
  pendientesOffline?: number;
  onContinuar: () => void;
  onRegistrarIncidencia: () => void;
  onAbrirRegistroManual: () => void;
  onReintentarPermiso?: () => void;
}

export function QrExceptionDialog({
  excepcion,
  estudiante,
  horaIngresoPrevio,
  motivoInhabilitacion,
  ambienteAsignado,
  ambienteActual,
  pendientesOffline,
  onContinuar,
  onRegistrarIncidencia,
  onAbrirRegistroManual,
  onReintentarPermiso,
}: QrExceptionDialogProps) {
  // Configuración visual según el tipo de excepción (Mockups oficiales)
  const getHeaderTitle = () => {
    switch (excepcion) {
      case "YA_REGISTRADO":
        return "Estudiante ya registrado";
      case "NO_HABILITADO":
        return "Estudiante no habilitado";
      case "AMBIENTE_INCORRECTO":
        return "Ambiente incorrecto";
      case "QR_INVALIDO":
        return "QR no válido";
      case "QR_CADUCADO":
        return "Código QR expirado";
      case "SIN_CONEXION":
        return "Ingreso guardado sin conexión";
      case "CAMARA_DENEGADA":
        return "Permiso de cámara requerido";
      default:
        return "Excepción de ingreso";
    }
  };

  const formatSis = (sis?: string) => {
    if (!sis) return "";
    const clean = sis.replace(/[^0-9]/g, "");
    if (clean.length === 9) {
      return `${clean.substring(0, 4)}-${clean.substring(4)}`;
    }
    return sis;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-end justify-center p-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 flex flex-col relative animate-in slide-in-from-bottom duration-200 border-t border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Barra superior de arrastre en mobile */}
        <div className="h-1 w-12 rounded-full bg-slate-200 mx-auto mb-3 shrink-0" />

        {/* Encabezado con título y botón de cierre */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-bold text-slate-900">
            {getHeaderTitle()}
          </h3>
          <button
            type="button"
            onClick={onContinuar}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar excepción"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-5 flex flex-col items-center text-center">
          {/* 1. ESTUDIANTE YA REGISTRADO (Mockup 4) */}
          {excepcion === "YA_REGISTRADO" && (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-1">
                Estudiante ya registrado
              </h4>

              {estudiante && (
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  {estudiante.nombre} {estudiante.apellido ?? ""} ·{" "}
                  {formatSis(estudiante.codSis)}
                </p>
              )}

              <div className="w-full bg-[#FEF9E7] border border-[#F9E79F] rounded-2xl p-3.5 mb-6 text-center">
                <p className="text-xs text-amber-900 font-semibold">
                  Ingreso previo registrado a las{" "}
                  {horaIngresoPrevio || "08:47:32"}.
                </p>
              </div>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Continuar
              </button>

              <button
                type="button"
                onClick={onRegistrarIncidencia}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registrar incidencia
              </button>
            </>
          )}

          {/* 2. ESTUDIANTE NO HABILITADO (Mockup 5) */}
          {excepcion === "NO_HABILITADO" && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <X className="h-8 w-8 stroke-[2.5]" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-1">
                Estudiante no habilitado
              </h4>

              {estudiante && (
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  {estudiante.nombre} {estudiante.apellido ?? ""} ·{" "}
                  {formatSis(estudiante.codSis)}
                </p>
              )}

              <div className="w-full bg-[#FDF2F2] border border-[#F8D7DA] rounded-2xl p-3.5 mb-2 text-center">
                <p className="text-xs text-red-800 font-semibold">
                  {motivoInhabilitacion ||
                    "Inscripción de la asignatura no confirmada"}
                </p>
              </div>

              <p className="text-[11px] text-red-600/90 font-medium mb-6">
                Este intento de ingreso quedó registrado en la bitácora.
              </p>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Continuar
              </button>

              <button
                type="button"
                onClick={onRegistrarIncidencia}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registrar incidencia
              </button>
            </>
          )}

          {/* 3. AMBIENTE INCORRECTO (Criterio de aceptación + Task-9.8) */}
          {excepcion === "AMBIENTE_INCORRECTO" && (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-1">
                Ambiente incorrecto
              </h4>

              {estudiante && (
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  {estudiante.nombre} {estudiante.apellido ?? ""} ·{" "}
                  {formatSis(estudiante.codSis)}
                </p>
              )}

              <div className="w-full bg-[#FEF9E7] border border-[#F9E79F] rounded-2xl p-3.5 mb-2 text-center">
                <p className="text-xs text-amber-900 font-semibold">
                  El estudiante está asignado a:{" "}
                  <span className="font-bold underline">
                    {ambienteAsignado || "Ambiente no asignado"}
                  </span>
                </p>
                {ambienteActual && (
                  <p className="text-[11px] text-amber-800/80 mt-1">
                    (Ambiente actual de este control: {ambienteActual})
                  </p>
                )}
              </div>

              <p className="text-[11px] text-amber-800/80 font-medium mb-6">
                Este intento de ingreso quedó registrado en la bitácora.
              </p>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Continuar
              </button>

              <button
                type="button"
                onClick={onRegistrarIncidencia}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registrar incidencia
              </button>
            </>
          )}

          {/* 4. QR NO VÁLIDO (Mockup 1) */}
          {excepcion === "QR_INVALIDO" && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-50 text-red-700 flex items-center justify-center mb-4">
                <LayoutGrid className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-3">
                QR no válido
              </h4>

              <div className="w-full bg-[#FDF2F2] border border-[#F8D7DA] rounded-2xl p-4 mb-6 text-center">
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  No se pudo reconocer el código. Comprueba que pertenezca a un
                  estudiante registrado para este examen o utiliza el registro manual.
                </p>
              </div>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Volver a escanear
              </button>

              <button
                type="button"
                onClick={onAbrirRegistroManual}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registro manual
              </button>
            </>
          )}

          {/* 5. CÓDIGO QR EXPIRADO / CADUCADO */}
          {excepcion === "QR_CADUCADO" && (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-3">
                Código QR expirado
              </h4>

              <div className="w-full bg-[#FEF9E7] border border-[#F9E79F] rounded-2xl p-4 mb-6 text-center">
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  El código QR presentado ha expirado porque superó el tiempo límite
                  de vigencia o el examen ha finalizado. Solicita al estudiante generar
                  un nuevo código en su portal o utiliza el registro manual.
                </p>
              </div>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Volver a escanear
              </button>

              <button
                type="button"
                onClick={onAbrirRegistroManual}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registro manual
              </button>
            </>
          )}

          {/* 6. INGRESO GUARDADO SIN CONEXIÓN */}
          {excepcion === "SIN_CONEXION" && (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <RotateCw className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-1">
                Ingreso guardado sin conexión
              </h4>

              {estudiante ? (
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  {estudiante.nombre} {estudiante.apellido ?? ""}
                  {estudiante.codSis ? ` · ${formatSis(estudiante.codSis)}` : ""}
                </p>
              ) : (
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  Estudiante verificado en modo offline
                </p>
              )}

              <div className="w-full bg-[#FEF9E7] border border-[#F9E79F] rounded-2xl p-3.5 mb-2 text-center">
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  El ingreso quedó guardado localmente y se sincronizará automáticamente cuando vuelva la conexión.
                </p>
              </div>

              <p className="text-[11px] text-amber-900/80 font-medium mb-6">
                {pendientesOffline ?? 1} ingreso{(pendientesOffline ?? 1) === 1 ? "" : "s"} pendiente{(pendientesOffline ?? 1) === 1 ? "" : "s"} de sincronización
              </p>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Continuar
              </button>

              <button
                type="button"
                onClick={onRegistrarIncidencia}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registrar incidencia
              </button>
            </>
          )}

          {/* 7. PERMISO DE CÁMARA DENEGADO */}
          {excepcion === "CAMARA_DENEGADA" && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <CameraOff className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Permiso de cámara requerido
              </h4>

              <div className="w-full bg-[#FDF2F2] border border-[#F8D7DA] rounded-2xl p-4 mb-6 text-center">
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  Para utilizar el escáner continuo debes conceder acceso a la
                  cámara en los ajustes de tu navegador, o puedes continuar
                  utilizando el registro manual.
                </p>
              </div>

              <button
                type="button"
                onClick={onAbrirRegistroManual}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Registro manual
              </button>

              {onReintentarPermiso && (
                <button
                  type="button"
                  onClick={onReintentarPermiso}
                  className="w-full mt-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Volver a intentar
                </button>
              )}
            </>
          )}

          {/* 8. FALLBACK SEGURO ANTE CUALQUIER OTRA EXCEPCIÓN */}
          {!["YA_REGISTRADO", "NO_HABILITADO", "AMBIENTE_INCORRECTO", "QR_INVALIDO", "QR_CADUCADO", "SIN_CONEXION", "CAMARA_DENEGADA"].includes(excepcion) && (
            <>
              <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8" />
              </div>

              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Observación de ingreso
              </h4>

              <div className="w-full bg-[#FEF9E7] border border-[#F9E79F] rounded-2xl p-4 mb-6 text-center">
                <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                  Se ha generado una excepción en la validación del código QR.
                  Por favor continúa para reintentar o utiliza el registro manual.
                </p>
              </div>

              <button
                type="button"
                onClick={onContinuar}
                className="w-full py-3.5 px-4 rounded-xl bg-[#002D62] text-white font-bold text-sm hover:bg-[#00224d] transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                Continuar
              </button>

              <button
                type="button"
                onClick={onAbrirRegistroManual}
                className="w-full mt-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Registro manual
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
