'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '@/features/auth/api/auth-api';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { LoginPublicNavbar } from '@/features/auth/components/LoginPublicNavbar';
import { LoginPublicFooter } from '@/features/auth/components/LoginPublicFooter';

const resetSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'Debe confirmar la contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (values: ResetFormValues) => {
    if (!token) {
      setErrorMsg('Token de recuperación no encontrado en la URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await resetPassword(token, values.password);
      setSuccessMsg(res.message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al restablecer la contraseña.';
      setErrorMsg(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-12 mb-24 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#003770] mb-2">Crear nueva contraseña</h1>
        <p className="text-sm text-gray-500">Ingresa tu nueva contraseña para acceder al sistema.</p>
      </div>

      {successMsg ? (
        <div className="space-y-6 text-center">
          <div className="flex justify-center text-green-600 mb-4">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <p className="text-green-700 font-medium">{successMsg}</p>
          <Button
            onClick={() => router.push('/login?modal=login')}
            className="w-full bg-[#003770] hover:bg-[#002850]"
          >
            Ir a Iniciar Sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!token && !errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Atención: El enlace no parece válido (falta el token).</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nueva contraseña
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="h-11 rounded-lg border-input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className="h-11 rounded-lg border-input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isLoading || !token}
              className="h-11 w-full rounded-lg bg-[#003770] hover:bg-[#002a55] text-white font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Restablecer contraseña'
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/login')}
              className="h-11 w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function RecuperarPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <LoginPublicNavbar onOpenLogin={() => {}} />
      <main className="flex-1 flex flex-col pt-[88px] px-4 md:px-8 bg-gradient-to-b from-slate-50 to-slate-100">
        <Suspense fallback={<div className="mt-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#003770]" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <LoginPublicFooter />
    </div>
  );
}
