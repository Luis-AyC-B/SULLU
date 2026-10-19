'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';

interface ProfileTextFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  registration: UseFormRegisterReturn;
  type?: 'text' | 'tel';
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}

/** Campo numérico con ícono a la izquierda, etiqueta y mensaje de error. */
export function ProfileTextField({
  id,
  label,
  icon: Icon,
  registration,
  type = 'text',
  placeholder,
  autoComplete = 'off',
  maxLength,
  error,
  disabled,
}: ProfileTextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
          aria-hidden="true"
        />
        <Input
          id={id}
          type={type}
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 bg-white pl-10"
          {...registration}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}