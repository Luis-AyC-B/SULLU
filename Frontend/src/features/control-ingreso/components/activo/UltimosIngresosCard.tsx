"use client";

import type { UltimoIngresoItem } from "../../types/control-ingreso.types";

interface UltimosIngresosCardProps {
  ingresos: UltimoIngresoItem[];
  isLoading: boolean;
}

export function UltimosIngresosCard({
  ingresos,
  isLoading,
}: UltimosIngresosCardProps) {
  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Últimos ingresos
        </h3>
        <span className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
          Ver lista
        </span>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-slate-200 rounded" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-3 w-10 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && ingresos.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">
          Aún no se han registrado ingresos en este examen.
        </p>
      )}

      {!isLoading && ingresos.length > 0 && (
        <div className="flex flex-col divide-y divide-slate-100">
          {ingresos.map((item) => {
            const iniciales = item.nombre
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f4f9] text-xs font-bold text-[#002D62]">
                    {iniciales}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {item.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500">{item.codSis}</p>
                  </div>
                </div>

                <span className="text-xs font-medium text-slate-500 shrink-0 pl-2">
                  {item.hora}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
