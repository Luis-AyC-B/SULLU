"use client";

import { ClipboardCheck } from "lucide-react";

export function ExamenesEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4">
        <ClipboardCheck className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        Sin exámenes asignados
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        Actualmente no tienes exámenes asignados para realizar el control de
        ingreso. Contacta con tu coordinador o docente responsable.
      </p>
    </div>
  );
}
