"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/components/ui/input";

interface UserTableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

/**
 * Barra superior de la tabla de usuarios.
 * Único campo de búsqueda: filtra por nombre (y apellido) en el cliente
 * o dispara el fetch filtrado, según cómo se conecte en useUsers.ts.
 */
export function UserTableToolbar({
  searchTerm,
  onSearchChange,
}: UserTableToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre..."
          className="bg-card pl-9 text-body"
          aria-label="Buscar usuario por nombre"
        />
      </div>
    </div>
  );
}