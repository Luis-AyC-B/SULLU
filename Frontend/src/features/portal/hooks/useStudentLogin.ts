'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { StudentLoginValues } from '../types/student-exam.types';

const MSG_INVALID = 'Código SIS o CI incorrectos. Verifica tus datos e intenta de nuevo.';
const MSG_LOCKED = 'Demasiados intentos fallidos. El acceso está bloqueado temporalmente, intenta más tarde.';
const MSG_SERVER = 'No pudimos conectar con el servidor. Intenta de nuevo.';

export function useStudentLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function login(values: StudentLoginValues) {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signIn('student-credentials', {
        sis: values.sis,
        ci: values.ci,
        redirect: false,
      });

      if (!result || result.error) {
        setAuthError(result?.error === 'ACCOUNT_LOCKED' ? MSG_LOCKED : MSG_INVALID);
        return;
      }

      router.push('/portal');
      router.refresh();
    } catch {
      setAuthError(MSG_SERVER);
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, authError, clearError: () => setAuthError(null) };
}