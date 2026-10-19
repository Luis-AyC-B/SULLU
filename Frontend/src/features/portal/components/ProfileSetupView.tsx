'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageContainer } from '@/shared/components/layout/PageContainer';
import { useMiPerfil } from '../hooks/useMiPerfil';
import { BTN_PRIMARIO, BTN_SECUNDARIO } from '../lib/estilos-perfil';
import { ProfileSetupForm } from './ProfileSetupForm';

interface ProfileSetupViewProps {
  /** Se llama al terminar de configurar el perfil, o desde el botón si el perfil ya estaba completo. */
  onContinue?: () => void;
}

export function ProfileSetupView({ onContinue }: ProfileSetupViewProps) {
  const { perfil, isLoading, hasError, retry } = useMiPerfil();

  return (
    <PageContainer
      title="Configura tu perfil"
      subtitle="Completa tu fotografía, tus datos y tu contraseña para usar tu código QR y ver tus exámenes"
    >
      {isLoading && (
        <div className="mx-auto flex max-w-3xl flex-col gap-5" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && hasError && (
        <div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-foreground">
            No pudimos cargar tu perfil. Revisa tu conexión e intenta de nuevo.
          </p>
          <Button variant="outline" onClick={retry} className={`mt-4 h-11 ${BTN_SECUNDARIO}`}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !hasError && perfil?.perfilCompleto && (
        <div
          role="status"
          className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            Tu perfil ya está completo.
          </p>
          {onContinue && (
            <Button onClick={onContinue} className={`h-11 ${BTN_PRIMARIO}`}>
              Ir a mis exámenes
            </Button>
          )}
        </div>
      )}

      {!isLoading && !hasError && perfil && !perfil.perfilCompleto && (
        <ProfileSetupForm perfil={perfil} onCompleted={() => onContinue?.()} />
      )}
    </PageContainer>
  );
}