"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  limpiarCacheOfflineEstudiante,
  obtenerUsuarioOffline,
} from "@/features/portal/lib/offline-portal";
import {
  guardarSesionOffline,
  obtenerUsuarioOperadorOffline,
  limpiarSesionOffline,
} from "@/shared/lib/offline-auth";
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
  // Si viene el nombre del rol desde el backend, usarlo directamente
  if (session?.user?.rol) {
    return String(session.user.rol).toUpperCase();
  }
  if (session?.user?.role) {
    return String(session.user.role).toUpperCase();
  }

  // Portal del estudiante (HU6): su sesión solo tiene el permiso portal_estudiante
  if (session?.user?.permisos?.includes("portal_estudiante")) {
    return "ESTUDIANTE";
  }

  // Fallback: inferir del correo (solo si el backend no envió el rol)
  const email = session?.user?.email?.toLowerCase() || "";
  if (email.includes("admin")) return "ADMINISTRADOR";
  if (email.includes("control")) return "CONTROL DE INGRESO";
  if (email.includes("docente")) return "DOCENTE";

  return "USUARIO";
}

interface HeaderProps {
  /** Muestra la opción "Perfil" en el menú de usuario. El portal del estudiante la oculta. */
  showProfile?: boolean;
}

/**
 * Header de la aplicación (cuando el usuario ya inició sesión)
 */
export function Header({ showProfile = true }: HeaderProps = {}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [cached, setCached] = useState<{ nombre: string; rol: string } | null>(null);

  // Guardar en caché local cuando hay sesión activa
  useEffect(() => {
    if (session?.user) {
      const rolName = getRolDisplayName(session);
      guardarSesionOffline({
        nombre: session.user.name || "Usuario",
        rol: rolName,
        email: session.user.email,
        permisos: (session.user.permisos as string[]) || [],
      });
    }
  }, [session]);

  // Recuperar usuario en caché para modo offline
  useEffect(() => {
    const operador = obtenerUsuarioOperadorOffline();
    if (operador) {
      setCached({ nombre: operador.nombre, rol: operador.rol });
    } else {
      setCached(obtenerUsuarioOffline());
    }
  }, [session]);

  // Nombre del usuario con fallback representativo
  const nombre = session?.user?.name || cached?.nombre || "Usuario";
  const rol = session
    ? getRolDisplayName(session)
    : (cached?.rol ?? "Usuario").toUpperCase();
  
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

  const handleLogout = async () => {
    setIsMenuOpen(false);
    limpiarCacheOfflineEstudiante();
    limpiarSesionOffline();
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <header className="flex h-16 w-full items-center justify-between bg-[#002D62] px-3 md:px-6 shadow-sm border-b border-[#001f45] select-none text-white z-30">
      {/* Extremo Superior Izquierdo: Logos Institucionales (más chicos en mobile) */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* 1. Logo UMSS Dark Mode */}
        <img
          src="/LogoUMSSDarkMode.png"
          alt="Universidad Mayor de San Simón"
          className="h-6 sm:h-9 w-auto object-contain shrink-0"
        />

        {/* 2. Logo ExaControl Sin Nombre + Nombre ExaControl en rojo pareciendo parte del logo */}
        <div className="flex items-center gap-1 sm:gap-1.5 sm:ml-2">
          <img
            src="/LogoExaControlSinNombre.png"
            alt="ExaControl"
            className="h-4 sm:h-6 w-auto object-contain shrink-0"
          />
          <span className="text-sm sm:text-lg font-black tracking-tight text-[#E30613]">
            ExaControl
          </span>
        </div>
      </div>

      {/* Extremo Superior Derecho: Sección Usuario (Rol, Nombre y Avatar interactivo) */}
      <div className="relative flex items-center gap-2 md:gap-3 shrink-0" ref={menuRef}>
        {/* Rol Badge (diseño oficial: azul oscuro, borde sutil, texto blanco en mayúsculas) */}
        <div className="hidden sm:inline-flex items-center justify-center rounded-full bg-[#001f45]/70 border border-white/20 px-3 py-1 text-xs font-bold tracking-wider text-white shadow-inner uppercase">
          {rol}
        </div>

        {/* Nombre del Usuario (oculto en pantallas muy angostas) */}
        <span className="hidden md:block max-w-[150px] lg:max-w-[200px] truncate text-sm font-medium text-white/95">
          {nombre}
        </span>

        {/* Avatar circular interactivo con iniciales */}
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
          aria-label="Abrir menú de usuario"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="relative flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-[#E30613] text-white font-bold text-sm shadow-md ring-2 ring-white/20 transition-all duration-200 hover:ring-white/50 hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#E30613] focus:ring-offset-2 focus:ring-offset-[#002D62]"
        >
          {iniciales}
        </button>

        {/* Menú Flotante Dropdown */}
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-md bg-white py-1.5 shadow-xl ring-1 ring-black/10 focus:outline-none z-50 text-slate-800 animate-in fade-in-0 zoom-in-95 duration-100">
            {/* Header del Menú (visible siempre en el popup) */}
            <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{nombre}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#E30613]"></span>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {rol}
                </p>
              </div>
            </div>

            {/* Opción 1: Perfil (oculta en el portal del estudiante) */}
            {showProfile && (
              <button
                type="button"
                onClick={handleGoToProfile}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 text-left"
              >
                <User className="h-4 w-4 text-slate-400" />
                <span>Perfil</span>
              </button>
            )}

            {/* Separador */}
            {showProfile && <div className="my-1 border-t border-slate-100" />}

            {/* Opción 2: Cerrar Sesión */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-[#E30613] transition-colors hover:bg-red-50 text-left font-medium"
            >
              <LogOut className="h-4 w-4 text-[#E30613]" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
