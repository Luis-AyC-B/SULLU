'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface WelcomeHeroProps {
  onOpenLogin: () => void;
}

/**
 * Sección Hero de la Página de Bienvenida
 * Basada en el mockup oficial (media_1789864261565.png).
 * Utiliza hero-campus.jpg de fondo y LogoExaControlPaginaBienvenida.png como la marca visual integrada en el lado izquierdo.
 */
export function WelcomeHero({ onOpenLogin }: WelcomeHeroProps) {
  return (
    <section className="relative w-full overflow-hidden bg-slate-900 shadow-md">
      {/* Imagen fotográfica de fondo auténtica del campus */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/hero-campus.jpg')",
        }}
        aria-hidden="true"
      />

      {/* Capa de contraste y oscurecimiento para legibilidad perfecta */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/35" />

      {/* Contenedor de contenido alineado al mockup */}
      <div className="relative z-10 mx-auto flex min-h-[380px] sm:min-h-[420px] max-w-7xl flex-col items-center justify-between px-4 py-12 sm:px-6 sm:py-16 md:flex-row lg:px-8 gap-8">
        {/* Lado Izquierdo: Imagen oficial LogoExaControlPaginaBienvenida.png */}
        <div className="flex items-center justify-center md:justify-start select-none">
          <img
            src="/LogoExaControlPaginaBienvenida.png"
            alt="ExaControl"
            className="h-28 sm:h-36 md:h-44 lg:h-48 w-auto object-contain drop-shadow-2xl transition-transform hover:scale-102"
          />
        </div>

        {/* Lado Derecho: Título del sistema, descripción y botón de acceso */}
        <div className="flex max-w-xl flex-col items-center text-center md:items-start md:text-left text-white">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white drop-shadow-md">
            Sistema de Control de Exámenes Universitarios
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-100/95 leading-relaxed drop-shadow-sm">
            Plataforma institucional para la gestión, habilitación y control de
            ingreso en evaluaciones académicas. Administra exámenes, estudiantes y
            personal de control desde un solo lugar.
          </p>

          <Button
            type="button"
            size="lg"
            onClick={onOpenLogin}
            className="mt-6 inline-flex h-11 items-center gap-2.5 rounded-lg bg-[#003770] px-6 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-[#002a55] hover:shadow-2xl transition-all cursor-pointer"
          >
            Acceder al sistema
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
