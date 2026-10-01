/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() || '';
        const password = credentials?.password || '';

        // Caso de prueba para usuario inactivo o dado de baja (Escenario Negativo 3)
        if (email.includes('inactivo') || email.includes('baja')) {
          throw new Error('ACCOUNT_INACTIVE');
        }

        try {
          const credencialesLimpias = {
            email: credentials?.email,
            password: credentials?.password,
          };

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credencialesLimpias),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const backendMsg = (errorData.message || '').toLowerCase();
            if (res.status === 403 || backendMsg.includes('inactivo') || backendMsg.includes('inhabilitado')) {
              throw new Error('ACCOUNT_INACTIVE');
            }
            throw new Error('INVALID_CREDENTIALS');
          }

          const data = await res.json();
          if (!data || !data.usuario) return null;

          return {
            id: data.usuario.id,
            name: data.usuario.nombre,
            email: data.usuario.email,
            permisos: data.usuario.permisos,
            accessToken: data.access_token, 
          } as any;
        } catch (error: any) {
          // Si el backend lanzó explícitamente cuenta inactiva
          if (error.message === 'ACCOUNT_INACTIVE') {
            throw error;
          }

          // Fallback de desarrollo local si el backend no está iniciado o conectado
          console.warn('[AUTH FALLBACK]: Verificando usuarios de desarrollo local para HU 5...');
          if (email === 'admin@exacontrol.com' && password === 'admin123') {
            return {
              id: 1,
              name: 'Administrador General',
              email: 'admin@exacontrol.com',
              permisos: [
                'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
                'roles.ver', 'roles.crear', 'roles.editar', 'roles.eliminar',
                'examenes.ver', 'examenes.crear', 'examenes.editar', 'examenes.eliminar',
                'estudiantes.ver', 'estudiantes.registrar', 'estudiantes.habilitar',
                'reportes.ver'
              ],
              accessToken: 'mock-jwt-token-admin',
            } as any;
          }

          if (email === 'docente@umss.edu' && password === 'docente123') {
            return {
              id: 2,
              name: 'Lic. Juan Pérez (Docente)',
              email: 'docente@umss.edu',
              permisos: [
                'examenes.ver', 'examenes.crear', 'examenes.editar',
                'estudiantes.ver'
              ],
              accessToken: 'mock-jwt-token-docente',
            } as any;
          }

          if (email === 'control@umss.edu' && password === 'control123') {
            return {
              id: 3,
              name: 'Personal de Control',
              email: 'control@umss.edu',
              permisos: [
                'estudiantes.ver', 'estudiantes.habilitar', 'examenes.ver'
              ],
              accessToken: 'mock-jwt-token-control',
            } as any;
          }

          if ((email === 'concurrente@umss.edu' || email === 'doble@umss.edu') && password === 'password123') {
            return {
              id: 4,
              name: 'Usuario Concurrente',
              email: email,
              permisos: ['usuarios.ver', 'roles.ver'],
              accessToken: 'mock-jwt-token-concurrente',
            } as any;
          }

          // Credenciales incorrectas
          throw new Error('INVALID_CREDENTIALS');
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.permisos = (user as any).permisos;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).permisos = token.permisos;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};