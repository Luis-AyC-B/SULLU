'use client';

import { useSession } from 'next-auth/react';

export function StudentPortalHeader() {
  const { data: session } = useSession();
  const nombre = session?.user?.name ?? '';

  return (
    <header className="sticky top-0 z-30 bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8">
        {/* Fondo blanco para que los logos a color se lean sobre el azul */}
        <div className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-1">
          <img src="/LogoUMSS.png" alt="Universidad Mayor de San Simón" className="h-8 w-auto object-contain" />
          <div className="h-6 w-px bg-slate-300" aria-hidden="true" />
          <img src="/LogoExaControl.png" alt="ExaControl" className="h-8 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium tracking-wide sm:inline">
            ESTUDIANTE
          </span>
          {nombre && <span className="hidden text-sm sm:inline">{nombre}</span>}
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-sm font-semibold text-white"
          >
            {nombre.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}