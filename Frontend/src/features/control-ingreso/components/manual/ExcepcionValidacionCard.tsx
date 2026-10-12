"use client";

import { AlertTriangle, AlertCircle, Clock } from "lucide-react";
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

  const handleRegistrarIncidencia = () => {
    onCerrar();
    router.push(
      `/incidencias?examenId=${examenId}&estudianteId=${excepcion.estudiante.id}&tipo=${excepcion.tipo}&sis=${excepcion.estudiante.codSis}&nombre=${encodeURIComponent(
        `${excepcion.estudiante.nombre} ${excepcion.estudiante.apellido ?? ""}`.trim()
      )}`
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

  const getColorClasses = () => {
    switch (excepcion.tipo) {
      case "YA_REGISTRADO":
        return "bg-amber-50 text-amber-900 border-amber-200";
      case "NO_HABILITADO":
        return "bg-rose-50 text-rose-900 border-rose-200";
      case "AMBIENTE_INCORRECTO":
        return "bg-orange-50 text-orange-900 border-orange-200";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`p-5 rounded-2xl border flex items-start gap-4 ${getColorClasses()}`}
      >
        <div className="p-2 rounded-xl bg-white/80 shrink-0 shadow-2xs">
          {getIcon()}
        </div>
        <div>
          <h4 className="text-base font-bold mb-1">{excepcion.titulo}</h4>
          <p className="text-xs leading-relaxed opacity-90">
            {excepcion.mensaje}
          </p>

          <div className="mt-3 pt-3 border-t border-black/10 text-xs font-medium">
            <p>
              Estudiante:{" "}
              <span className="font-bold">
                {excepcion.estudiante.nombre} {excepcion.estudiante.apellido ?? ""}
              </span>{" "}
              ({excepcion.estudiante.codSis})
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleRegistrarIncidencia}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs md:text-sm font-semibold transition-colors cursor-pointer"
        >
          Registrar incidencia
        </button>
        <button
          type="button"
          onClick={onContinuar}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#002D62] hover:bg-[#001D42] text-white text-xs md:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
