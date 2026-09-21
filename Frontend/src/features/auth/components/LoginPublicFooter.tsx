'use client';

/**
 * Footer Institucional Público Inferior
 * Fondo azul marino institucional oscuro (#001B38) con branding de ExaControl y acreditación de la UMSS.
 */
export function LoginPublicFooter() {
  return (
    <footer className="bg-[#001B38] py-6 px-4 sm:px-6 lg:px-8 text-white border-t border-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row text-center md:text-left">
        {/* Lado Izquierdo: Marca ExaControl */}
        <div className="flex items-center gap-2.5">
          <img
            src="/LogoExaControlSinNombre.png"
            alt="ExaControl"
            className="h-6 w-auto object-contain"
          />
          <span className="text-sm font-black tracking-tight text-[#E30613]">
            ExaControl
          </span>
          <span className="hidden sm:inline-block text-slate-500 font-light">|</span>
          <span className="text-xs text-slate-300 hidden sm:inline-block">
            Sistema de Control de Exámenes
          </span>
        </div>

        {/* Centro: Copyright y Dirección institucional */}
        <div className="text-[11px] text-slate-400">
          © 2026 Universidad — Dirección de Tecnología Educativa. Todos los derechos reservados.
        </div>

        {/* Lado Derecho: Identidad UMSS Dark Mode */}
        <div className="flex items-center gap-2.5">
          <img
            src="/LogoUMSSDarkMode.png"
            alt="UMSS"
            className="h-8 w-auto object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
