"use client";

import { useSession } from "next-auth/react";

/**
 * Función auxiliar para inferir o formatear el nombre del rol asignado al usuario actual.
 */
function getRolDisplayName(session: any): string {
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
 * Basado en el mockup oficial (media_1789864393611.png).
 * Extremo izquierdo: LogoUMSSDarkMode.png + LogoExaControlSinNombre.png + ExaControl en rojo.
 * Extremo derecho: Nombre del usuario, Rol asignado y Avatar con iniciales.
 */
export function Header() {
  const { data: session } = useSession();

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
    .toUpperCase() || "US";

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

      {/* Extremo Superior Derecho: Nombre de usuario, Rol asignado y Avatar */}
      <div className="flex items-center gap-3">
        {/* Contenedor de Texto: Nombre arriba, Rol en píldora abajo */}
        <div className="flex flex-col items-end text-right">
          <span className="text-xs sm:text-sm font-medium text-white leading-tight">
            {nombre}
          </span>
          <span className="mt-0.5 inline-flex items-center rounded-full bg-[#001D40] px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-200 border border-white/10 uppercase shadow-2xs">
            {rol}
          </span>
        </div>

        {/* Avatar Circular Verde con Iniciales (exacto al mockup) */}
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[#0E7A4A] text-xs font-bold text-white shadow-xs border border-white/20">
          {iniciales}
        </div>
      </div>
    </header>
  );
}