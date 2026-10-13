'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useStudentLogin } from '../hooks/useStudentLogin';
import { studentLoginSchema, type StudentLoginValues } from '../types/student-exam.types';

interface StudentLoginViewProps {
  onClose?: () => void;
}

export function StudentLoginView({ onClose }: StudentLoginViewProps) {
  const { login, isLoading, authError } = useStudentLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentLoginValues>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { sis: '', ci: '' },
  });

  return (
    <div className="relative w-full max-w-[420px] rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl sm:p-9">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar inicio de sesión de estudiante"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ingreso de estudiantes</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa con tu código SIS y tu CI</p>
      </div>

      {authError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed sm:text-sm">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(login)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="sis-input" className="block text-sm font-medium text-slate-700">
            Código SIS
          </label>
          <Input
            id="sis-input"
            inputMode="numeric"
            placeholder="201900123"
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={!!errors.sis}
            aria-describedby={errors.sis ? 'sis-error' : undefined}
            className={`h-11 rounded-lg bg-slate-50/50 px-3.5 text-sm ${
              errors.sis ? 'border-destructive ring-1 ring-destructive' : ''
            }`}
            {...register('sis')}
          />
          {errors.sis && (
            <p id="sis-error" className="mt-1 text-xs font-medium text-destructive">
              {errors.sis.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ci-input" className="block text-sm font-medium text-slate-700">
            CI
          </label>
          <Input
            id="ci-input"
            placeholder="8123456"
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={!!errors.ci}
            aria-describedby={errors.ci ? 'ci-error' : undefined}
            className={`h-11 rounded-lg bg-slate-50/50 px-3.5 text-sm ${
              errors.ci ? 'border-destructive ring-1 ring-destructive' : ''
            }`}
            {...register('ci')}
          />
          {errors.ci && (
            <p id="ci-error" className="mt-1 text-xs font-medium text-destructive">
              {errors.ci.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-lg bg-[#003770] text-sm font-medium text-white shadow-md transition-all hover:bg-[#002a55] hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando datos...
              </>
            ) : (
              'Ingresar'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}