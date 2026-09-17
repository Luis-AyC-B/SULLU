"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserPermissions } from "@/shared/hooks/useUserPermissions";

export function Sidebar() {
  const pathname = usePathname();
  const modulosPermitidos = useUserPermissions();

  if (modulosPermitidos.length === 0) {
    return (
      <aside className="hidden md:flex h-full w-72 flex-col items-center justify-center bg-primary py-4 text-sm text-primary-foreground/60">
        Sin módulos asignados
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex h-full w-72 flex-col bg-primary py-4 animate-in slide-in-from-left-4 fade-in duration-300">
      <nav className="flex flex-col gap-2 overflow-y-auto px-3">
        {modulosPermitidos.map((modulo) => {
          const Icon = modulo.icon;
          const isActive = pathname.startsWith(modulo.ruta);

          return (
            <Link
              key={modulo.clave}
              href={modulo.ruta}
              className={`flex items-center gap-3 rounded-md px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "border-l-4 border-destructive bg-primary-foreground/15 text-primary-foreground font-semibold"
                  : "text-primary-foreground/80 hover:translate-x-1 hover:bg-primary-foreground/10"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {modulo.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}