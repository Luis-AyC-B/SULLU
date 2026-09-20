'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getLandingRoute } from '@/features/auth/hooks/useLogin';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const modulo = searchParams.get('modulo') || 'solicitada';
  const userPermissions = (session?.user as { permisos?: string[] })?.permisos;
  const backRoute = getLandingRoute(userPermissions);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F0] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl border border-slate-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-[#E30613]">
          <ShieldAlert className="h-9 w-9" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Acceso no autorizado
        </h1>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Tu cuenta o rol actual no cuenta con los permisos necesarios para acceder a la sección{' '}
          <span className="font-semibold text-slate-800 uppercase tracking-wide">
            {modulo}
          </span>.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            onClick={() => router.push(backRoute)}
            className="w-full bg-[#003770] hover:bg-[#002850] text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a mi panel principal
          </Button>

          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
