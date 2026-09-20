'use client';

import Link from 'next/link';
import { Search, GraduationCap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface LoginPublicNavbarProps {
  onOpenLogin?: () => void;
}

/**
 * Barra de Navegación Pública Superior (Navbar)
 * Basada en el mockup oficial (media_1789864020558.png).
 * Muestra LogoUMSS.png a la izquierda y LogoExaControl.png a la derecha con el mismo alto y sin deformarse.
 */
export function LoginPublicNavbar({ onOpenLogin }: LoginPublicNavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Identidad Institucional y Enlaces */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          {/* Contenedor de Logos: LogoUMSS.png | LogoExaControl.png */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/LogoUMSS.png"
                alt="Universidad Mayor de San Simón"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain shrink-0"
              />
            </Link>

            {/* Separador vertical institucional */}
            <div className="h-6 w-px bg-slate-300 shrink-0" aria-hidden="true" />

            <Link href="/" className="flex items-center shrink-0">
              <img
                src="/LogoExaControl.png"
                alt="ExaControl"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain shrink-0"
              />
            </Link>
          </div>

          {/* Enlaces de Navegación Pública */}
          <nav className="hidden md:flex items-center gap-6 ml-2">
            <Link
              href="/"
              className="text-xs font-bold text-slate-900 transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="#noticias"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Noticias
            </Link>
            <Link
              href="#ayuda"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Ayuda
            </Link>
            <Link
              href="#contacto"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Contacto
            </Link>
          </nav>
        </div>

        {/* Acciones del lado derecho */}
        <div className="flex items-center gap-3">
          {/* Buscador institucional tipo píldora */}
          <div className="hidden lg:flex relative items-center">
            <Search className="absolute left-3.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="h-9 w-44 xl:w-56 rounded-full border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003770] transition-all"
            />
          </div>

          {/* Botón ¿eres estudiante? */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-xs text-slate-700 hover:text-[#003770] hover:bg-slate-100/80 gap-1.5 font-medium"
            onClick={() => {
              const el = document.getElementById('noticias');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <GraduationCap className="h-4 w-4 text-[#D98300]" />
            ¿eres estudiante?
          </Button>

          {/* Botón Iniciar sesión (Abre el Modal de Login) */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onOpenLogin}
            className="h-9 rounded-lg bg-[#003770] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#002a55] transition-all cursor-pointer"
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    </header>
  );
}
