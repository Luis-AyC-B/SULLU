"use client";

interface ConnectionStatusBadgeProps {
  status?: "sincronizado" | "en_linea";
}

export function ConnectionStatusBadge({
  status = "sincronizado",
}: ConnectionStatusBadgeProps) {
  const isSincronizado = status === "sincronizado";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none ${
        isSincronizado
          ? "bg-[#e8f8f0] text-[#0d8a55] border border-[#a3e6c3]/40"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
      <span>{isSincronizado ? "Sincronizado" : "En línea"}</span>
    </div>
  );
}
