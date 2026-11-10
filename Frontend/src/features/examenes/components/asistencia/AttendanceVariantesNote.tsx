"use client";

import React from "react";

export function AttendanceVariantesNote() {
  return (
    <div className="rounded-xl border border-amber-200 bg-[#FEFCE8] p-4 text-xs text-[#854D0E] shadow-xs">
      <h4 className="font-bold mb-1">
        <span className="hidden sm:inline">
          Variante – examen programado que aún no inicia
        </span>
        <span className="sm:hidden">Variantes</span>
      </h4>
      <p className="mt-0.5">
        <span className="hidden sm:inline">
          Los ausentes se ocultan y se muestra «El examen aún no inicia» (a confirmar).
        </span>
        <span className="sm:hidden">
          Examen sin iniciar: «El examen aún no inicia».
        </span>
      </p>
      <p className="mt-0.5">
        <span className="hidden sm:inline">
          Estado vacío (0 habilitados): «Este examen no tiene estudiantes habilitados».
        </span>
        <span className="sm:hidden">
          0 habilitados: «Este examen no tiene estudiantes habilitados».
        </span>
      </p>
    </div>
  );
}
