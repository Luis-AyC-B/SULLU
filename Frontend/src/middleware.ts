import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Orden de prioridad para redirigir tras el login: [prefijo de permiso, ruta]
const redirectsPorModulo: [string, string][] = [
  ['portal_estudiante', '/portal'],
  ['usuarios', '/usuarios'],
  ['roles', '/roles'],
  ['examenes', '/examenes'],
  ['estudiantes', '/estudiantes'],
  ['ambientes', '/ambientes'],
  ['control_ingreso', '/control-ingreso'],
  ['registro_ingresos', '/ingresos'],
  ['incidencias', '/incidencias'],
  ['colaboradores', '/colaboradores'],
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 1. Si el usuario ya está autenticado e intenta entrar a /login, redirigirlo a su primer módulo disponible
    if (pathname.startsWith('/login') && token) {
      const permisos = (token.permisos as string[]) || [];

      for (const [prefijo, ruta] of redirectsPorModulo) {
        if (permisos.some((p) => p === prefijo || p.startsWith(`${prefijo}.`))) {
          return NextResponse.redirect(new URL(ruta, req.url));
        }
      }
      return NextResponse.redirect(new URL('/usuarios', req.url));
    }

    // 2. Control de Acceso Basado en Roles / Permisos (Escenario Negativo 4)
    // "Dado que el usuario ya inició sesión, cuando intenta acceder a una función que no corresponde a su rol,
    // entonces el sistema bloquea el acceso a esa función."
    if (token) {
      const permisos = (token.permisos as string[]) || [];

      // Mapeo de rutas a prefijos de permisos requeridos
      const routePermissions: Record<string, string> = {
        '/usuarios': 'usuarios',
        '/roles': 'roles',
        '/examenes': 'examenes',
        '/estudiantes': 'estudiantes',
        '/reportes': 'reportes',
        '/ambientes': 'ambientes',
        '/control-ingreso': 'control_ingreso',
        '/ingresos': 'registro_ingresos',
        '/incidencias': 'incidencias',
        '/colaboradores': 'colaboradores',
        '/portal': 'portal_estudiante',
      };

      for (const [routePrefix, requiredPrefix] of Object.entries(routePermissions)) {
        if (pathname.startsWith(routePrefix)) {
          const hasAccess = permisos.some(
            (p) => p === requiredPrefix || p.startsWith(`${requiredPrefix}.`)
          );

          if (!hasAccess) {
            // Bloquea el acceso y redirige a la pantalla de No Autorizado
            const unauthorizedUrl = new URL('/unauthorized', req.url);
            unauthorizedUrl.searchParams.set('modulo', requiredPrefix);
            return NextResponse.redirect(unauthorizedUrl);
          }
          break;
        }
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // La pantalla de login y unauthorized son públicas
        if (pathname.startsWith('/login') || pathname.startsWith('/unauthorized') || pathname.startsWith('/recuperar-password')) {
          return true;
        }
        // El resto de rutas protegidas del dashboard requieren sesión activa
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto archivos estáticos, api auth e imágenes
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};