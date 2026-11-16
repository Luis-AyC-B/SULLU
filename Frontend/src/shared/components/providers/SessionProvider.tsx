"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

// Interceptar peticiones a /api/auth/ cuando el navegador está sin conexión (modo offline)
// Esto evita que next-auth lance "TypeError: Failed to fetch" y dispare [CLIENT_FETCH_ERROR] en consola
if (typeof window !== "undefined" && !(window as unknown as { __nextauth_fetch_intercepted?: boolean }).__nextauth_fetch_intercepted) {
  (window as unknown as { __nextauth_fetch_intercepted?: boolean }).__nextauth_fetch_intercepted = true;
  const originalFetch = window.fetch;

  const responderSesionOffline = () => {
    try {
      const raw = localStorage.getItem("sullu_offline_user");
      if (raw) {
        const user = JSON.parse(raw);
        return new Response(
          JSON.stringify({
            user: {
              name: user.nombre,
              email: user.email,
              role: user.rol,
              rol: user.rol,
              permisos: user.permisos || [],
            },
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch {}
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";

    if (url.includes("/api/auth/session") || url.includes("/api/auth/_log")) {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        if (url.includes("/api/auth/session")) {
          return responderSesionOffline();
        }
        return new Response(null, { status: 200 });
      }

      try {
        return await originalFetch.apply(this, [input, init] as [RequestInfo | URL, RequestInit | undefined]);
      } catch {
        if (url.includes("/api/auth/session")) {
          return responderSesionOffline();
        }
        return new Response(null, { status: 200 });
      }
    }

    return originalFetch.apply(this, [input, init] as [RequestInfo | URL, RequestInit | undefined]);
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}