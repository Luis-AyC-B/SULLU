"use client";

import { AlertTriangle, AlertCircle, Clock, ChevronLeft, FileWarning, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ExcepcionDetalle } from "../../hooks/useRegistroManual";

interface ExcepcionValidacionCardProps {
  excepcion: ExcepcionDetalle;
  examenId: number;
  onContinuar: () => void;
  onCerrar: () => void;
}

export function ExcepcionValidacionCard({
  excepcion,
  examenId,
  onContinuar,
  onCerrar,
}: ExcepcionValidacionCardProps) {
  const router = useRouter();
  const estudiante = excepcion.estudiante;
  const nombreCompleto = `${estudiante.nombre} ${estudiante.apellido ?? ""}`.trim();

  const handleRegistrarIncidencia = () => {
    onCerrar();
    // Mapeo a tipos de incidencia oficiales de la BD
    let tipoIncidenciaQuery = "IDENTIDAD_NO_COINCIDE";
    if (excepcion.tipo === "YA_REGISTRADO") {
      tipoIncidenciaQuery = "DOBLE_MARCACION";
    } else if (excepcion.tipo === "NO_HABILITADO") {
      tipoIncidenciaQuery = "NO_HABILITADO";
    }

    router.push(
      `/incidencias?examenId=${examenId}&estudianteId=${estudiante.id}&tipo=${tipoIncidenciaQuery}&sis=${estudiante.codSis}&nombre=${encodeURIComponent(
        nombreCompleto
      )}&ci=${estudiante.ci || ""}&motivo=${encodeURIComponent(excepcion.mensaje)}`
    );
  };

  const getIcon = () => {
    switch (excepcion.tipo) {
      case "YA_REGISTRADO":
        return <Clock className="h-6 w-6 text-amber-600" />;
      case "NO_HABILITADO":
        return <AlertCircle className="h-6 w-6 text-rose-600" />;
      case "AMBIENTE_INCORRECTO":
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
    }
  };

  const getBadge = () => {
    switch (excepcion.tipo) {
      case "YA_REGISTRADO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Doble marcación
          </span>
        );
      case "NO_HABILITADO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            No habilitado
          </span>
        );
      case "AMBIENTE_INCORRECTO":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            Ambiente incorrecto
          </span>
        );
    }
  };

  const getContainerStyle = () => {
    switch (excepcion.tipo) {
      case "YA_REGISTRADO":
        return "bg-amber-50/70 border-amber-200/90 text-amber-950";
      case "NO_HABILITADO":
        return "bg-rose-50/70 border-rose-200/90 text-rose-950";
      case "AMBIENTE_INCORRECTO":
        return "bg-orange-50/70 border-orange-200/90 text-orange-950";
    }
  };

  const getSugerenciaResolucion = () => {
    switch (excepcion.tipo) {
      case "YA_REGISTRADO":
        return "Verifica si el estudiante salió previamente o si alguien más utilizó sus datos. Si sospechas suplantación, registra una incidencia.";
      case "NO_HABILITADO":
        return "El estudiante no cumple los requisitos para este examen. No está autorizado para ingresar.";
      case "AMBIENTE_INCORRECTO":
        return `Indica al estudiante que debe dirigirse a su ambiente asignado: "${estudiante.ambienteAsignado}".`;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Botón Volver a resultados */}
      <button
        type="button"
        onClick={onContinuar}
        className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer self-start -ml-1 group"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Volver a resultados</span>
      </button>

      {/* Tarjeta Principal de Excepción */}
      <div className={`p-4 md:p-5 rounded-2xl border ${getContainerStyle()}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-2xs">
              {getIcon()}
            </div>
            <div>
              <h4 className="text-base md:text-lg font-bold">
                {excepcion.titulo}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Intento de ingreso no autorizado
              </p>
            </div>
          </div>
          {getBadge()}
        </div>

        <p className="text-xs md:text-sm leading-relaxed mb-4">
          {excepcion.mensaje}
        </p>

        {/* Ficha Resumida del Estudiante */}
        <div className="p-3 bg-white/90 rounded-xl border border-black/5 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Estudiante:</span>
            <span className="font-bold text-slate-900">{nombreCompleto}</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-500">SIS / CI:</span>
            <span className="font-semibold text-slate-800">
              {estudiante.codSis} {estudiante.ci && `· ${estudiante.ci}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Carrera:</span>
            <span className="text-slate-700 truncate max-w-[200px]">{estudiante.carrera}</span>
          </div>
          {estudiante.ambienteAsignado && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ambiente asignado:</span>
              <span className="font-semibold text-slate-900">{estudiante.ambienteAsignado}</span>
            </div>
          )}
        </div>

        {/* Sugerencia operativa */}
        <p className="text-[11px] text-slate-600 mt-3 pt-2.5 border-t border-black/5 italic">
          💡 {getSugerenciaResolucion()}
        </p>
      </div>

      {/* Botones de Acción */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={handleRegistrarIncidencia}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs md:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
        >
          <FileWarning className="h-4 w-4 text-amber-700" />
          <span>Registrar incidencia</span>
        </button>

        <button
          type="button"
          onClick={onContinuar}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white text-xs md:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
        >
          <span>Continuar</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
