"use client";

import React from "react";
import { Users } from "lucide-react";

export function AttendanceEmptyAlert() {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs md:text-sm text-blue-900 flex items-center gap-3">
      <div className="rounded-full bg-blue-100 p-2 text-blue-600 shrink-0">
        <Users className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold">Este examen no tiene estudiantes habilitados</p>
        <p className="text-blue-700 text-xs mt-0.5">
          No hay estudiantes matriculados o con acceso asignado para registrar asistencia.
        </p>
      </div>
    </div>
  );
}
