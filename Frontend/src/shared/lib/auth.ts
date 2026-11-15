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


        try {
          const credencialesLimpias = {
            email: credentials?.email,
            password: credentials?.password,
          };

          const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
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
            rol: data.usuario.rol,
            accessToken: data.access_token, 
          } as any;
        } catch (error: any) {
          // Si el backend lanzó explícitamente cuenta inactiva
          if (error.message === 'ACCOUNT_INACTIVE') {
            throw error;
          }

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
        token.rol = (user as any).rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).permisos = token.permisos;
        (session.user as any).rol = token.rol;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
