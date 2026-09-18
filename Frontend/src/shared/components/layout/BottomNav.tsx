"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { useUserPermissions } from "@/shared/hooks/useUserPermissions";

const MAX_VISIBLE = 4;

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const modulosPermitidos = useUserPermissions();

  if (modulosPermitidos.length === 0) {
    return null;
  }

  const visibles = modulosPermitidos.slice(0, MAX_VISIBLE);
  const resto = modulosPermitidos.slice(MAX_VISIBLE);
  const hasOverflow = resto.length > 0;
  const restoActivo = resto.some((m) => pathname.startsWith(m.ruta));

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div className="fixed inset-x-0 bottom-16 z-50 rounded-t-xl bg-card p-4 shadow-lg md:hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Más módulos</span>
            <button onClick={() => setShowMore(false)} aria-label="Cerrar">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {resto.map((modulo) => {
              const Icon = modulo.icon;
              const isActive = pathname.startsWith(modulo.ruta);
              return (
                <Link
                  key={modulo.clave}
                  href={modulo.ruta}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1 text-xs ${
                    isActive ? "font-semibold text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {modulo.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card md:hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
        {visibles.map((modulo) => {
          const Icon = modulo.icon;
          const isActive = pathname.startsWith(modulo.ruta);

          return (
            <Link
              key={modulo.clave}
              href={modulo.ruta}
              className={`flex flex-col items-center gap-1 text-xs transition-all duration-200 ${
                isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-primary/70"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
              />
              {modulo.label}
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex flex-col items-center gap-1 text-xs transition-all duration-200 ${
              restoActivo ? "font-semibold text-primary" : "text-muted-foreground hover:text-primary/70"
            }`}
          >
            <MoreHorizontal className={`h-5 w-5 ${restoActivo ? "scale-110" : ""}`} />
            Más
          </button>
        )}
      </nav>
    </>
  );
}