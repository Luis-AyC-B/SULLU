"use client";

import React from "react";

export type MetricVariant = "habilitados" | "presentes" | "ausentes";

interface AttendanceMetricCardProps {
  variant: MetricVariant;
  label: string;
  value: number | null;
  percentage?: number;
  isNotStarted?: boolean;
  notStartedText?: string;
}

export function AttendanceMetricCard({
  variant,
  label,
  value,
  percentage = 0,
  isNotStarted = false,
  notStartedText = "El examen aún no inicia",
}: AttendanceMetricCardProps) {
  // Configuración visual por variante según los mockups
  const config = {
    habilitados: {
      border: "border-l-4 border-l-[#1E3A8A]",
      textValue: "text-[#1E3A8A]",
      badgeBg: "bg-blue-100 text-blue-700",
    },
    presentes: {
      border: "border-l-4 border-l-[#0D9488]",
      textValue: "text-[#0D9488]",
      badgeBg: "bg-emerald-100 text-emerald-700",
    },
    ausentes: {
      border: "border-l-4 border-l-[#C2410C]",
      textValue: "text-[#C2410C]",
      badgeBg: "bg-amber-100 text-amber-700",
    },
  }[variant];

  // Caso especial para ausentes cuando el examen aún no inicia
  const showNotStarted = variant === "ausentes" && (isNotStarted || value === null);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all ${config.border} flex flex-col justify-between min-h-[110px]`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {!showNotStarted && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${config.badgeBg}`}
          >
            {Math.round(percentage)} %
          </span>
        )}
      </div>

      <div className="mt-2">
        {showNotStarted ? (
          <p className="text-sm font-medium text-amber-800 italic">
            {notStartedText}
          </p>
        ) : (
          <span className={`text-4xl font-extrabold ${config.textValue}`}>
            {value ?? 0}
          </span>
        )}
      </div>
    </div>
  );
}
