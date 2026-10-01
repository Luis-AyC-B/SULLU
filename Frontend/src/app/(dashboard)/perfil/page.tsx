'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { User, Mail, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function PerfilPage() {
  const { data: session } = useSession();

  const nombre = session?.user?.name || 'Prof. Luis Medina';
  const email = session?.user?.email || 'usuario@umss.edu';

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/usuarios" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver al panel principal
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D3101E] text-xl font-bold text-white shadow-md">
            {nombre
              .split(' ')
              .filter(Boolean)
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{nombre}</h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3.5">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Nombre Completo</p>
              <p className="text-sm font-semibold text-foreground">{nombre}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3.5">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Correo Institucional</p>
              <p className="text-sm font-semibold text-foreground">{email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3.5">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Estado de la Cuenta</p>
              <p className="text-sm font-semibold text-emerald-600">Activo e identificado</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border flex justify-end">
          <Button variant="outline" asChild size="sm">
            <Link href="/usuarios">Regresar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
