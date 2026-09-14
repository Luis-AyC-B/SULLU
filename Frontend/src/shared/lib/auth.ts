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
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
          credentials,
        );
        if (!data) return null;
        return {
          id: data.usuario.id,
          name: data.usuario.nombre,
          email: data.usuario.email,
          rolId: data.usuario.rolId,
          accessToken: data.accessToken,
        } as any;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.rolId = (user as any).rolId;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).rolId = token.rolId;
      return session;
    },
  },
  pages: { signIn: '/login' },
};