'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoginFormValues } from '../schemas/login.schema';
import { SessionConflictInfo } from '../types/auth.types';
import { 
  checkActiveSession, 
  invalidatePreviousSession, 
  logAuditAuthEvent, 
  preValidateAccountStatus 
} from '../api/auth-api';
import { modules } from '@/shared/config/modules';

/**
 * Determina dinámicamente la ruta inicial (Landing Route) del usuario autenticado
 * según los módulos y permisos asignados a su cuenta (soporta roles dinámicos).
 */
export function getLandingRoute(permisos?: string[]): string {
  if (!permisos || permisos.length === 0) {
    return '/usuarios';
  }

  // Comprueba la prioridad de navegación según los módulos autorizados
  if (permisos.some((p) => p.startsWith('usuarios') || p === 'usuarios')) {
    return '/usuarios';
  }
  if (permisos.some((p) => p.startsWith('roles') || p === 'roles')) {
    return '/roles';
  }
  if (permisos.some((p) => p.startsWith('examenes') || p === 'examenes')) {
    return '/examenes';
  }
  if (permisos.some((p) => p.startsWith('estudiantes') || p === 'estudiantes')) {
    return '/estudiantes';
  }
  if (permisos.some((p) => p.startsWith('reportes') || p === 'reportes')) {
    return '/reportes';
  }

  // Fallback: busca el primer módulo configurado en el sistema que tenga coincidencia
  const firstMatch = modules.find((m) => permisos.includes(m.clave));
  return firstMatch ? firstMatch.ruta : '/usuarios';
}

export function useLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Estado para el modal de control de concurrencia de sesiones
  const [sessionConflict, setSessionConflict] = useState<SessionConflictInfo | null>(null);
  const [pendingValues, setPendingValues] = useState<LoginFormValues | null>(null);

  /**
   * Ejecuta el login definitivo en NextAuth una vez validadas las condiciones
   */
  async function executeSignIn(values: LoginFormValues) {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        const errorCode = result?.error;

        if (errorCode === 'ACCOUNT_INACTIVE') {
          const inactiveMsg = 'El usuario no está habilitado para acceder al sistema.';
          setAuthError(inactiveMsg);
          await logAuditAuthEvent({
            accion: 'LOGIN_FALLIDO',
            modulo: 'AUTH',
            email: values.email,
            detallesNuevo: { motivo: 'Cuenta inactiva / dada de baja' },
          });
          return;
        }

        // Mensaje genérico de seguridad para evitar enumeración de cuentas
        const genericErrorMsg = 'Correo o contraseña incorrectos. Por favor verifique sus datos.';
        setAuthError(genericErrorMsg);
        await logAuditAuthEvent({
          accion: 'LOGIN_FALLIDO',
          modulo: 'AUTH',
          email: values.email,
          detallesNuevo: { motivo: 'Credenciales inválidas' },
        });
        return;
      }

      // Login exitoso: obtener la sesión para calcular la redirección por rol dinámico
      const session = await getSession();
      const userPermissions = (session?.user as { permisos?: string[] })?.permisos;
      const destination = getLandingRoute(userPermissions);

      await logAuditAuthEvent({
        accion: 'LOGIN_EXITOSO',
        modulo: 'AUTH',
        email: values.email,
        detallesNuevo: { destino: destination },
      });

      // Guardar preferencia de "Recordar" si el usuario lo marcó
      if (typeof window !== 'undefined') {
        if (values.rememberMe) {
          localStorage.setItem('exacontrol_remember_email', values.email);
        } else {
          localStorage.removeItem('exacontrol_remember_email');
        }
      }

      router.push(destination);
      router.refresh();
    } catch {
      setAuthError('Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Disparador principal del formulario de login
   */
  async function login(values: LoginFormValues) {
    setIsLoading(true);
    setAuthError(null);

    try {
      // 1. Validar si la cuenta está inactiva de antemano
      const accountStatusError = await preValidateAccountStatus(values.email);
      if (accountStatusError) {
        setAuthError(accountStatusError.message);
        setIsLoading(false);
        await logAuditAuthEvent({
          accion: 'LOGIN_FALLIDO',
          modulo: 'AUTH',
          email: values.email,
          detallesNuevo: { motivo: 'Cuenta dada de baja preliminar' },
        });
        return;
      }

      // 2. Validar si existe sesión activa en otro dispositivo (Criterio de concurrencia)
      const sessionCheck = await checkActiveSession(values.email);
      if (sessionCheck.hasActiveSession && sessionCheck.conflictInfo) {
        // Pausar y mostrar diálogo de confirmación de concurrencia
        setPendingValues(values);
        setSessionConflict(sessionCheck.conflictInfo);
        setIsLoading(false);
        return;
      }

      // 3. Proceder al inicio de sesión normal
      await executeSignIn(values);
    } catch {
      setAuthError('Correo o contraseña incorrectos. Por favor verifique sus datos.');
      setIsLoading(false);
    }
  }

  /**
   * Manejador cuando el usuario acepta invalidar la sesión previa e iniciar en este dispositivo
   * (Escenario Positivo 3)
   */
  async function confirmSessionOverride() {
    if (!pendingValues) return;

    setIsLoading(true);
    const email = pendingValues.email;
    setSessionConflict(null);

    try {
      // Invalidar sesión previa
      await invalidatePreviousSession(email);
      // Continuar inicio de sesión
      await executeSignIn(pendingValues);
    } finally {
      setPendingValues(null);
      setIsLoading(false);
    }
  }

  /**
   * Manejador cuando el usuario cancela ante el aviso de sesión abierta
   * (Escenario Negativo 6): Mantiene el formulario intacto y no inicia sesión
   */
  function cancelSessionOverride() {
    setSessionConflict(null);
    setPendingValues(null);
    setIsLoading(false);
  }

  return {
    login,
    isLoading,
    authError,
    clearError: () => setAuthError(null),
    sessionConflict,
    confirmSessionOverride,
    cancelSessionOverride,
  };
}