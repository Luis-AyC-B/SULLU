'use client';

import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  registration: UseFormRegisterReturn;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  maxLength?: number;
  disabled?: boolean;
}

/** Campo de contraseña con ícono a la izquierda y botón para mostrar u ocultar lo escrito. */
export function PasswordField({
  id,
  label,
  autoComplete,
  registration,
  icon: Icon,
  error,
  hint,
  maxLength,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
            aria-hidden="true"
          />
        )}
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 bg-white pr-10 ${Icon ? 'pl-10' : ''}`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-primary"
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