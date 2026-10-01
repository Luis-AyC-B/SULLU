"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";

/**
 * Función auxiliar para inferir o formatear el nombre del rol asignado al usuario actual.
 */
interface SessionUserWithRoles {
  user?: {
    name?: string | null;
    email?: string | null;
    rol?: string;
    role?: string;
    permisos?: string[];
  };
  permisos?: string[];
}

function getRolDisplayName(session: SessionUserWithRoles | null | undefined): string {
  // Si viene explícito en la sesión
  if (session?.user?.rol) {
    return String(session.user.rol).toUpperCase();
  }
  if (session?.user?.role) {
    return String(session.user.role).toUpperCase();
  }

  // Si se dispone de la lista de permisos del usuario
  const permisos: string[] = session?.user?.permisos || [];
  if (
    permisos.includes("usuarios.crear") ||
    permisos.includes("roles.crear") ||
    permisos.includes("usuarios.ver")
  ) {
    return "ADMINISTRADOR";
  }
  if (
    permisos.includes("examenes.crear") ||
    permisos.some((p) => p.startsWith("examenes"))
  ) {
    return "DOCENTE";
  }
  if (
    permisos.includes("estudiantes.habilitar") ||
    permisos.some((p) => p.startsWith("estudiantes"))
  ) {
    return "CONTROL DE INGRESO";
  }

  // Si el correo o nombre sugieren el rol
  const email = session?.user?.email?.toLowerCase() || "";
  if (email.includes("admin")) return "ADMINISTRADOR";
  if (email.includes("docente")) return "DOCENTE";
  if (email.includes("control")) return "CONTROL DE INGRESO";

  return "DOCENTE";
}

/**
 * Header de la aplicación (cuando el usuario ya inició sesión)
 * Basado en los mockups oficiales (media_1789864393611.png y media_1789917596801.png).
 * Extremo izquierdo: LogoUMSSDarkMode.png + LogoExaControlSinNombre.png + ExaControl en rojo.
 * Extremo derecho: Sección de usuario con rol, nombre, avatar e icono desplegable
 * que abre el modal/menú flotante para "Perfil" y "Cerrar sesión" funcional.
 */
export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Nombre del usuario con fallback representativo del mockup
  const nombre = session?.user?.name || "Prof. Luis Medina";
  const rol = getRolDisplayName(session);

  // Iniciales para el avatar circular
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PL";

  // Cerrar menú al hacer clic fuera del componente o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleGoToProfile = () => {
    setIsMenuOpen(false);
    router.push("/perfil");
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="flex h-16 w-full items-center justify-between bg-[#002D62] px-4 md:px-6 shadow-sm border-b border-[#001f45] select-none text-white z-30">
      {/* Extremo Superior Izquierdo: Logos Institucionales */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* 1. Logo UMSS Dark Mode */}
        <img
          src="/LogoUMSSDarkMode.png"
          alt="Universidad Mayor de San Simón"
          className="h-8 sm:h-9 w-auto object-contain shrink-0"
        />

        {/* 2. Logo ExaControl Sin Nombre + Nombre ExaControl en rojo pareciendo parte del logo */}
        <div className="flex items-center gap-1.5 ml-1 sm:ml-2">
          <img
            src="/LogoExaControlSinNombre.png"
            alt="ExaControl"
            className="h-5 sm:h-6 w-auto object-contain shrink-0"
          />
          <span className="text-base sm:text-lg font-black tracking-tight text-[#E30613]">
            ExaControl
          </span>
        </div>
      </div>

      {/* Extremo Superior Derecho: Sección de usuario interactiva con modal/menú flotante */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex items-center gap-2.5 sm:gap-3 rounded-xl p-1.5 hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          {/* Píldora del Rol asignado */}
          <span className="inline-flex items-center rounded-full bg-[#0c3b6f] px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-100 border border-white/10 uppercase shadow-2xs">
            {rol}
          </span>

          {/* Nombre del Usuario */}
          <span className="hidden sm:inline-block text-xs sm:text-sm font-medium text-white leading-tight">
            {nombre}
          </span>

          {/* Avatar Circular Rojo con Iniciales (exacto al mockup de media_1789917596801.png) */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[#D3101E] text-xs font-bold text-white shadow-xs ring-2 ring-[#003875]">
            {iniciales}
          </div>

          {/* Icono de flecha/salida según mockup */}
          <LogOut className="h-4 w-4 text-white/80 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Modal / Menú Flotante desplegable de Usuario */}
        {isMenuOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-white/15 bg-[#002D62] p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Opción 1: Perfil */}
            <button
              type="button"
              role="menuitem"
              onClick={handleGoToProfile}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <User className="h-5 w-5 text-white" />
              <span>Perfil</span>
            </button>

            {/* Separador sutil */}
            <div className="my-1.5 h-px w-full bg-white/15" />

            {/* Opción 2: Cerrar sesión (Color rojo coral según mockup) */}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#FF5252] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 text-[#FF5252]" />
              <span>Cerrar sesión</span>
            </button>

            {/* Indicador inferior redondeado según mockup */}
            <div className="mx-auto mt-2 mb-0.5 h-1 w-8 rounded-full bg-white/20" />
          </div>
        )}
      </div>
    </header>
  );
}