'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { guardarDatosPerfil } from '../api/student-profile.service';
import { mensajePerfilError } from '../lib/perfil-errors';
import {
  datosPerfilSchema,
  type DatosPerfilValues,
  type PerfilEstudiante,
} from '../types/student-profile.types';

interface ProfileDataFormProps {
  /** Valores ya guardados (null mientras el estudiante no los haya ingresado). */
  ci?: string | null;
  telefono?: string | null;
  /** Se llama con el perfil actualizado cuando el guardado termina bien. */
  onSaved: (perfil: PerfilEstudiante) => void;
  disabled?: boolean;
}

export function ProfileDataForm({ ci, telefono, onSaved, disabled = false }: ProfileDataFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosPerfilValues>({
    resolver: zodResolver(datosPerfilSchema),
    mode: 'onTouched',
    defaultValues: { ci: ci ?? '', telefono: telefono ?? '' },
  });

  const onSubmit = async (values: DatosPerfilValues) => {
    setSubmitError(null);
    setSaved(false);
    try {
      const perfil = await guardarDatosPerfil(values);
      reset({ ci: perfil.ci ?? values.ci, telefono: perfil.telefono ?? values.telefono });
      setSaved(true);
      onSaved(perfil);
    } catch (err) {
      setSubmitError(mensajePerfilError(err));
    }
  };

  const bloqueado = disabled || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="perfil-ci" className="text-sm font-medium text-foreground">
          Carnet de identidad
        </label>
        <Input
          id="perfil-ci"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="Ej. 8123456"
          disabled={bloqueado}
          aria-invalid={errors.ci ? true : undefined}
          aria-describedby={errors.ci ? 'perfil-ci-error' : undefined}
          {...register('ci', { onChange: () => setSaved(false) })}
        />
        {errors.ci && (
          <p id="perfil-ci-error" role="alert" className="text-sm text-destructive">
            {errors.ci.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="perfil-telefono" className="text-sm font-medium text-foreground">
          Teléfono celular
        </label>
        <Input
          id="perfil-telefono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={8}
          placeholder="Ej. 71234567"
          disabled={bloqueado}
          aria-invalid={errors.telefono ? true : undefined}
          aria-describedby={errors.telefono ? 'perfil-telefono-error' : undefined}
          {...register('telefono', { onChange: () => setSaved(false) })}
        />
        {errors.telefono && (
          <p id="perfil-telefono-error" role="alert" className="text-sm text-destructive">
            {errors.telefono.message}
          </p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      {saved && !submitError && (
        <p role="status" className="text-sm text-muted-foreground">
          Datos guardados.
        </p>
      )}

      <Button type="submit" disabled={bloqueado} className="h-11 w-full gap-2">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Guardando…' : 'Guardar datos'}
      </Button>
    </form>
  );
}