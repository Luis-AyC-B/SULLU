"use client";

import { useNetworkStatus } from "../../hooks/useNetworkStatus";

interface ConnectionStatusBadgeProps {
  status?: "sincronizado" | "en_linea";
}

export function ConnectionStatusBadge({
  status,
}: ConnectionStatusBadgeProps) {
  const network = useNetworkStatus();
  const isSincronizado = status ? status === "sincronizado" : network.isOnline;
  const label = status ? (isSincronizado ? "Sincronizado" : "En línea") : network.statusText;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none ${
        isSincronizado
          ? "bg-[#e8f8f0] text-[#0d8a55] border border-[#a3e6c3]/40"
          : "bg-red-50 text-red-600 border border-red-200"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isSincronizado ? "bg-[#10b981] animate-pulse" : "bg-red-500"}`} />
      <span>{label}</span>
    </div>
  );
}
