'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface ProfileTextFieldProps {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  type?: 'text' | 'tel';
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}

/** Campo numérico con etiqueta y mensaje de error. */
export function ProfileTextField({
  id,
  label,
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
      <Label htmlFor={id}>{label}</Label>
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
        className="focus-visible:border-input focus-visible:ring-0 aria-invalid:border-input aria-invalid:ring-0 dark:aria-invalid:border-input dark:aria-invalid:ring-0"
        {...registration}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}