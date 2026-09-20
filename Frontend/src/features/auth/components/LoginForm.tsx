'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldAlert, X } from 'lucide-react';
import { loginSchema, LoginFormValues } from '../schemas/login.schema';
import { useLogin } from '../hooks/useLogin';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ActiveSessionDialog } from './ActiveSessionDialog';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface LoginFormProps {
  onClose?: () => void;
}

export function LoginForm({ onClose }: LoginFormProps = {}) {
  const {
    login,
    isLoading,
    authError,
    sessionConflict,
    confirmSessionOverride,
    cancelSessionOverride,
  } = useLogin();

  const [showPassword, setShowPassword] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Cargar correo recordado si existe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('exacontrol_remember_email');
      if (savedEmail) {
        setValue('email', savedEmail);
        setValue('rememberMe', true);
      }
    }
  }, [setValue]);

  // Observador dinámico de contraseña para el contador de caracteres (0/12 del mockup)
  const passwordValue = watch('password') || '';
  const emailValue = watch('email') || '';

  const isInactiveError = authError?.toLowerCase().includes('habilitado');

  const onSubmit = (data: LoginFormValues) => {
    login(data);
  };

  return (
    <>
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white p-7 sm:p-9 shadow-2xl border border-slate-100 transition-all">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar modal de inicio de sesión"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {/* Encabezado de la tarjeta */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa con tus credenciales institucionales
          </p>
        </div>

        {/* Mensaje de error general de autenticación / cuenta inactiva */}
        {authError && (
          <div
            role="alert"
            className={`mb-5 flex items-start gap-3 rounded-xl p-3.5 text-sm transition-all animate-in fade-in slide-in-from-top-2 ${
              isInactiveError
                ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            {isInactiveError ? (
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" />
            )}
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              {authError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Campo Correo Institucional */}
          <div className="space-y-1.5">
            <label
              htmlFor="email-input"
              className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase"
            >
              CORREO INSTITUCIONAL
            </label>
            <Input
              id="email-input"
              type="email"
              placeholder="usuario@universidad.edu"
              autoComplete="username"
              disabled={isLoading}
              className={`h-11 rounded-lg border-input bg-slate-50/50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-primary ${
                errors.email ? 'border-destructive ring-1 ring-destructive' : ''
              }`}
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs font-medium text-destructive mt-1 animate-in fade-in">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Campo Contraseña con contador dinámico y toggle de visibilidad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password-input"
                className="text-sm font-medium text-slate-700"
              >
                Contraseña
              </label>
              <span className="text-[11px] font-mono text-slate-400 tracking-tight">
                {passwordValue.length}/12
              </span>
            </div>

            <div className="relative">
              <Input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                className={`h-11 rounded-lg border-input bg-slate-50/50 pl-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-primary ${
                  errors.password ? 'border-destructive ring-1 ring-destructive' : ''
                }`}
                {...register('password')}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                tabIndex={0}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {errors.password && (
              <p id="password-error" className="text-xs font-medium text-destructive mt-1 animate-in fade-in">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Opciones: Recordar contraseña y Enlace de recuperación */}
          <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                onCheckedChange={(checked) => setValue('rememberMe', Boolean(checked))}
                defaultChecked={false}
              />
              <label
                htmlFor="remember"
                className="text-xs text-slate-600 cursor-pointer select-none"
              >
                Recordar mi contraseña
              </label>
            </div>

            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs font-semibold text-[#003770] hover:text-[#002850] hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Botón principal de submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-lg bg-[#003770] hover:bg-[#002a55] text-white font-medium text-sm shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando credenciales...
                </>
              ) : (
                'Ingresar al sistema'
              )}
            </Button>
          </div>

          {/* Enlace secundario inferior según mockup */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs font-medium text-[#003770] hover:text-[#002850] hover:underline transition-colors"
            >
              Olvidé mi contraseña
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmación para control de concurrencia de sesiones */}
      <ActiveSessionDialog
        isOpen={Boolean(sessionConflict?.isOpen)}
        conflictInfo={sessionConflict}
        onConfirm={confirmSessionOverride}
        onCancel={cancelSessionOverride}
        isLoading={isLoading}
      />

      {/* Modal de recuperación de contraseña con respuesta neutra de seguridad */}
      <ForgotPasswordDialog
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={emailValue}
      />
    </>
  );
}