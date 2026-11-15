"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AttendanceErrorBannerProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function AttendanceErrorBanner({
  message,
  onRetry,
  isRetrying = false,
}: AttendanceErrorBannerProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs md:text-sm text-red-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>Reintentar</span>
        </button>
      )}
    </div>
  );
}
