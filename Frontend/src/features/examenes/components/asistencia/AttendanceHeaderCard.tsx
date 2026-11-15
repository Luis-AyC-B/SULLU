"use client";

import React from "react";
import { DashboardAsistencia } from "../../types/exam.types";

interface AttendanceHeaderCardProps {
  data: DashboardAsistencia;
  lastUpdatedLabel: string;
}

export function AttendanceHeaderCard({
  data,
  lastUpdatedLabel,
}: AttendanceHeaderCardProps) {
  // Normalizar badge según estado
  const getBadgeStyle = (estado: string) => {
    const norm = estado.toUpperCase();
    if (norm === "EN_CURSO" || norm === "EN CURSO") {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (norm === "PROXIMO" || norm === "PROGRAMADO") {
      return "bg-teal-100 text-teal-800 border-teal-200";
    }
    if (norm === "FINALIZADO") {
      return "bg-gray-100 text-gray-700 border-gray-200";
    }
    if (norm === "CANCELADO" || norm === "DESACTIVADO") {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getBadgeText = (estado: string) => {
    const norm = estado.toUpperCase();
    if (norm === "EN_CURSO" || norm === "EN CURSO") return "En curso";
    if (norm === "PROXIMO" || norm === "PROGRAMADO") return "Programado";
    if (norm === "FINALIZADO") return "Finalizado";
    if (norm === "CANCELADO" || norm === "DESACTIVADO") return "Desactivado";
    return estado;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          {/* Badge de estado */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getBadgeStyle(
              data.estado
            )}`}
          >
            {getBadgeText(data.estado)}
          </span>

          {/* Título de Materia y Tipo de Examen */}
          <h2 className="text-lg md:text-xl font-bold text-[#1A1D23] mt-2">
            {data.materia} – {data.tipoExamen}
          </h2>

          {/* Metadatos: Carrera · Ambiente · Fecha · Horario */}
          <p className="mt-1 text-xs md:text-sm text-gray-500 font-normal">
            {data.carrera} · {data.ambiente} · {data.fecha} · {data.horario}
          </p>
        </div>

        {/* Indicador de última actualización (en desktop dentro del card) */}
        <div className="hidden md:flex flex-col items-end justify-between self-stretch">
          <span className="text-xs text-gray-400 font-medium">
            {lastUpdatedLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
