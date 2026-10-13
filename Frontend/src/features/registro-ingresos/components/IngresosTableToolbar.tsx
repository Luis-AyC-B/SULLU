// src/features/registro-ingresos/components/IngresosTableToolbar.tsx
"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

interface IngresosTableToolbarProps {
  /** Se llama con el texto ya "debounced" (300 ms). */
  onSearchChange: (value: string) => void;
  debounceMs?: number;
}

export function IngresosTableToolbar({
  onSearchChange,
  debounceMs = 300,
}: IngresosTableToolbarProps) {
  const [value, setValue] = useState("");
  const debounced = useDebouncedValue(value, debounceMs);

  useEffect(() => {
    onSearchChange(debounced);
    // onSearchChange se omite a propósito: solo reaccionamos al texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="buscar-ingreso" className="text-sm font-medium text-foreground">
        Buscar estudiante
      </label>
      <div className="relative">
        <Input
          id="buscar-ingreso"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar por SIS o nombre"
          autoComplete="off"
          className="h-11 bg-card pr-10 text-base [&::-webkit-search-cancel-button]:hidden"
        />
        <Search
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}
