// src/features/registro-ingresos/components/BotonCasoExcepcional.tsx
"use client";

import { UserCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface BotonCasoExcepcionalProps {
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function BotonCasoExcepcional({
  onClick,
  disabled = false,
  disabledReason,
}: BotonCasoExcepcionalProps) {
  return (
    <div className="w-full sm:w-auto" title={disabledReason}>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        variant="outline"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-xs hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Casos excepcionales"
      >
        <UserCheck className="h-4 w-4 shrink-0 text-primary" />
        <span>Casos excepcionales</span>
      </Button>
    </div>
  );
}
