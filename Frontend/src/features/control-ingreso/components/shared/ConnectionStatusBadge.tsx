"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { offlineIngresosService } from "../../services/offline-ingresos.service";

interface ConnectionStatusBadgeProps {
  status?: "sincronizado" | "en_linea";
}

export function ConnectionStatusBadge({
  status,
}: ConnectionStatusBadgeProps) {
  const network = useNetworkStatus();
  const [pendientes, setPendientes] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      try {
        setPendientes(offlineIngresosService?.contarPendientesSync?.() ?? 0);
      } catch {
        setPendientes(0);
      }
    };
    update();
    if (typeof window !== "undefined") {
      window.addEventListener("sullu_offline_updated", update);
      return () =>
        window.removeEventListener("sullu_offline_updated", update);
    }
  }, []);

  // Si hay conexión y existen registros pendientes, disparar sincronización proactiva inmediata
  useEffect(() => {
    if (network.isOnline && pendientes > 0) {
      offlineIngresosService.sincronizarLote().catch(() => {});
    }
  }, [network.isOnline, pendientes]);

  const handleForzarSincronizacion = async () => {
    if (network.isOnline) {
      await offlineIngresosService.sincronizarLote().catch(() => {});
    }
  };

  // 1. Sin conexión: Respetar estado offline real de la red
  if (!network.isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none bg-amber-50 text-amber-800 border border-amber-200"
        title="Operando en modo sin conexión"
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span>
          {pendientes > 0
            ? `Modo offline (${pendientes} pend.)`
            : "Modo offline"}
        </span>
      </div>
    );
  }

  // 2. Con conexión pero sincronizando registros pendientes
  if (pendientes > 0) {
    return (
      <button
        type="button"
        onClick={handleForzarSincronizacion}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
        title="Clic para forzar sincronización inmediata con el servidor"
      >
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span>Sincronizando ({pendientes})...</span>
      </button>
    );
  }

  // 3. En línea y completamente sincronizado
  const label = status === "en_linea" ? "En línea" : "Sincronizado";

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none bg-[#e8f8f0] text-[#0d8a55] border border-[#a3e6c3]/40">
      <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
      <span>{label}</span>
    </div>
  );
}
