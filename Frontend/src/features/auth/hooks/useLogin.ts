import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoginFormValues } from '../schemas/login.schema';

export function useLogin() {
  const router = useRouter();

  async function login(values: LoginFormValues) {
    const result = await signIn('credentials', { ...values, redirect: false });
    if (result?.error) throw new Error('Credenciales inválidas');
    router.push('/roles');
  }

  return { login };
}