'use client';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { PageContainer } from '@/shared/components/layout/PageContainer';
import { useMiPerfil } from '../hooks/useMiPerfil';
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
        <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && hasError && (
        <Card role="alert" className="mx-auto flex max-w-3xl flex-col items-center gap-4 p-7 text-center sm:p-9">
          <p className="text-body text-foreground">
            No pudimos cargar tu perfil. Revisa tu conexión e intenta de nuevo.
          </p>
          <Button variant="outline" onClick={retry} className="h-10 px-4">
            Reintentar
          </Button>
        </Card>
      )}

      {!isLoading && !hasError && perfil?.perfilCompleto && (
        <Card
          role="status"
          className="mx-auto flex max-w-3xl flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9"
        >
          <p className="text-sm font-medium text-foreground">Tu perfil ya está completo.</p>
          {onContinue && (
            <Button onClick={onContinue} className="h-10 px-4">
              Ir a mis exámenes
            </Button>
          )}
        </Card>
      )}

      {!isLoading && !hasError && perfil && !perfil.perfilCompleto && (
        <ProfileSetupForm perfil={perfil} onCompleted={() => onContinue?.()} />
      )}
    </PageContainer>
  );
}