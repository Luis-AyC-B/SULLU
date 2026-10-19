'use client';

import { useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cambiarPassword, PerfilError } from '../api/student-profile.service';
import { mensajePerfilError } from '../lib/perfil-errors';
import {
  cambioPasswordSchema,
  PASSWORD_MAX,
  PASSWORD_MIN,
  type CambioPasswordValues,
} from '../types/student-profile.types';

interface ChangePasswordFormProps {
  /** Se llama cuando el back confirma el cambio de contraseña. */
  onChanged: () => void;
  disabled?: boolean;
}

/* ---------- Campo con botón para mostrar u ocultar ---------- */

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  registration: UseFormRegisterReturn;
  error?: string;
  hint?: string;
  maxLength?: number;
  disabled?: boolean;
}

function PasswordField({
  id,
  label,
  autoComplete,
  registration,
  error,
  hint,
  maxLength,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="pr-10"
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Formulario ---------- */

export function ChangePasswordForm({ onChanged, disabled = false }: ChangePasswordFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    trigger,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CambioPasswordValues>({
    resolver: zodResolver(cambioPasswordSchema),
    mode: 'onTouched',
    defaultValues: { passwordActual: '', passwordNueva: '', confirmar: '' },
  });

  const largoNueva = (watch('passwordNueva') ?? '').length;

  const onSubmit = async (values: CambioPasswordValues) => {
    setSubmitError(null);
    setChanged(false);
    try {
      await cambiarPassword(values);
      reset();
      setChanged(true);
      // TODO(back): confirmar si al cambiar la contraseña se invalida la sesión actual.
      // Si es así, aquí hay que cerrar sesión y mandar al estudiante a iniciar sesión de nuevo.
      onChanged();
    } catch (err) {
      if (err instanceof PerfilError && err.code === 'PASSWORD_ACTUAL_INCORRECTA') {
        setError('passwordActual', { type: 'server', message: mensajePerfilError(err) });
        return;
      }
      setSubmitError(mensajePerfilError(err));
    }
  };

  const bloqueado = disabled || isSubmitting;

  // Si ya escribió la confirmación, se revalida cuando cambia la contraseña nueva.
  const nueva = register('passwordNueva', {
    onChange: () => {
      setChanged(false);
      if (getValues('confirmar')) void trigger('confirmar');
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <PasswordField
        id="perfil-password-actual"
        label="Contraseña actual"
        autoComplete="current-password"
        registration={register('passwordActual', { onChange: () => setChanged(false) })}
        error={errors.passwordActual?.message}
        disabled={bloqueado}
      />

      <PasswordField
        id="perfil-password-nueva"
        label="Nueva contraseña"
        autoComplete="new-password"
        registration={nueva}
        error={errors.passwordNueva?.message}
        hint={`De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres, con al menos una letra y un número · ${largoNueva}/${PASSWORD_MAX}`}
        maxLength={PASSWORD_MAX}
        disabled={bloqueado}
      />

      <PasswordField
        id="perfil-password-confirmar"
        label="Confirmar nueva contraseña"
        autoComplete="new-password"
        registration={register('confirmar', { onChange: () => setChanged(false) })}
        error={errors.confirmar?.message}
        maxLength={PASSWORD_MAX}
        disabled={bloqueado}
      />

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      {changed && !submitError && (
        <p role="status" className="text-sm text-muted-foreground">
          Contraseña actualizada.
        </p>
      )}

      <Button type="submit" disabled={bloqueado} className="h-11 w-full gap-2">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}