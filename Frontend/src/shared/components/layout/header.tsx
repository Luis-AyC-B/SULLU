"use client";

import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  const nombre = session?.user?.name ?? "Usuario";
  const iniciales = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between bg-primary px-4 text-primary-foreground md:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden" aria-label="Abrir menú">
          <Menu className="h-6 w-6" />
        </button>

        <img
          src="/logo-universidad.svg"
          alt="Universidad Mayor de San Simón"
          className="h-8 w-8"
        />

        <span className="hidden text-sm font-medium leading-tight text-primary-foreground/90 md:block">
          Universidad
          <br />
          Mayor de San Simón
        </span>

        <span className="ml-2 text-base font-bold text-destructive sm:ml-4 sm:text-lg">
          ExaControl
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm sm:block">{nombre}</span>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-xs font-semibold text-success-foreground">
          {iniciales}
        </div>
      </div>
    </header>
  );
}