"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { modules } from "@/shared/config/modules";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-60 flex-col bg-primary py-4 transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-end px-3 md:hidden">
          <button onClick={onClose} aria-label="Cerrar menú">
            <X className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {modules.map((modulo) => {
            const Icon = modulo.icon;
            const isActive = pathname.startsWith(modulo.ruta);

            return (
              <Link
                key={modulo.clave}
                href={modulo.ruta}
                onClick={onClose}
               className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive? "border-l-4 border-destructive bg-primary-foreground/15 text-primary-foreground font-semibold"
                : "text-primary-foreground/80 hover:bg-primary-foreground/10"
}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {modulo.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}