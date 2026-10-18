"use client";

import { Calendar } from "lucide-react";
import { Colaborador } from "../schemas/colaborador.schema";
import { ColaboradorAvatar } from "./ColaboradorAvatar";
import { ColaboradorEstadoBadge } from "./ColaboradorEstadoBadge";

interface ColaboradorCardProps {
  colaborador: Colaborador;
  onGestionarExamenes: (colaborador: Colaborador) => void;
  onDarDeBaja: (colaborador: Colaborador) => void;
  isProcessing?: boolean;
}

export function ColaboradorCard({
  colaborador,
  onGestionarExamenes,
  onDarDeBaja,
  isProcessing = false,
}: ColaboradorCardProps) {
  const numExamenes =
    colaborador.examenesAsignadosCount ??
    (colaborador.examenesAsignadosIds?.length || 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
      {/* Top: Avatar, Nombre, Código SIS y Badge */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ColaboradorAvatar nombreCompleto={colaborador.nombreCompleto} />
            <div className="min-w-0">
              <h3 className="font-bold text-[#003770] text-base leading-snug truncate">
                {colaborador.nombreCompleto}
              </h3>
              <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                {colaborador.codSis && (
                  <span className="font-mono text-[#003770] font-semibold">
                    SIS: {colaborador.codSis}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <ColaboradorEstadoBadge estado={colaborador.estado} />
          </div>
        </div>

        {/* Fila intermedia: Fecha de solicitud y calendario */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
          <span>Solicitud · {colaborador.fechaSolicitud}</span>
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Separador */}
      <div className="border-t border-gray-100 my-4" />

      {/* Footer según el estado */}
      <div>
        {colaborador.estado === "APROBADO" && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-3">
              Exámenes asignados: {numExamenes}
            </p>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onGestionarExamenes(colaborador)}
                disabled={isProcessing}
                className="border border-gray-300 rounded-xl py-2 px-4 text-xs sm:text-sm font-semibold text-[#003770] hover:bg-gray-50 transition-colors flex-1 text-center cursor-pointer"
              >
                Gestionar exámenes
              </button>
              <button
                type="button"
                onClick={() => onDarDeBaja(colaborador)}
                disabled={isProcessing}
                className="text-rose-600 text-xs sm:text-sm font-semibold hover:underline px-3 py-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                Dar de baja
              </button>
            </div>
          </div>
        )}

        {colaborador.estado === "PENDIENTE" && (
          <p className="text-sm text-gray-500 py-1">Esperando aprobación</p>
        )}

        {colaborador.estado === "RECHAZADO" && (
          <p className="text-sm text-gray-500 py-1">Solicitud no aprobada</p>
        )}

        {colaborador.estado === "INACTIVO" && (
          <p className="text-sm text-gray-400 italic py-1">
            Ya no forma parte del equipo
          </p>
        )}
      </div>
    </div>
  );
}
