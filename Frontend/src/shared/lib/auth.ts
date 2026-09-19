/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

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
          // Extraemos estrictamente solo lo que el backend acepta (email y password)
          const credencialesLimpias = {
            email: credentials?.email,
            password: credentials?.password,
          };

          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            credencialesLimpias, // Enviamos el objeto limpio
          );

          if (!data || !data.usuario) return null;

          return {
            id: data.usuario.id,
            name: data.usuario.nombre,
            email: data.usuario.email,
            permisos: data.usuario.permisos,
            accessToken: data.access_token, 
          } as any;
        } catch (error: any) {
          console.error('ERROR EN LOGIN:', error.response?.data || error.message);
          return null;
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
        (session.user as any).permisos = token.permisos; // <--- Se asigna dentro de session.user
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};