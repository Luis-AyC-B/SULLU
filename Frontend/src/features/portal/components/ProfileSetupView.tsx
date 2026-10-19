'use client';

import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageContainer } from '@/shared/components/layout/PageContainer';
import { useMiPerfil } from '../hooks/useMiPerfil';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileDataForm } from './ProfileDataForm';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';

interface ProfileSetupViewProps {
  /** Si se pasa, al completar el perfil aparece un botón que la llama (la navegación la define quien use la vista). */
  onContinue?: () => void;
}

interface StepCardProps {
  numero: number;
  titulo: string;
  descripcion: string;
  completo: boolean;
  children: ReactNode;
}

function StepCard({ numero, titulo, descripcion, completo, children }: StepCardProps) {
  const headingId = `perfil-paso-${numero}`;
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-foreground">
            {numero}. {titulo}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        </div>
        {completo ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Listo
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Pendiente
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function ProfileSetupView({ onContinue }: ProfileSetupViewProps) {
  const { perfil, isLoading, hasError, retry, actualizar, refrescar } = useMiPerfil();
  // El back no dice por separado si la contraseña ya se cambió: se recuerda aquí mientras la pantalla esté abierta.
  const [passwordCambiada, setPasswordCambiada] = useState(false);

  const fotoOk = Boolean(perfil?.fotoUrl);
  const datosOk = Boolean(perfil?.ci && perfil?.telefono);
  const passwordOk = Boolean(perfil?.perfilCompleto) || passwordCambiada;
  const pasosListos = [fotoOk, datosOk, passwordOk].filter(Boolean).length;

  return (
    <PageContainer
      title="Configura tu perfil"
      subtitle="Completa estos 3 pasos para usar tu código QR y ver tus exámenes"
    >
      {isLoading && (
        <div className="mx-auto flex max-w-xl flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && hasError && (
        <div role="alert" className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-foreground">
            No pudimos cargar tu perfil. Revisa tu conexión e intenta de nuevo.
          </p>
          <Button variant="outline" onClick={retry} className="mt-4">
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !hasError && perfil && (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {perfil.perfilCompleto ? (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium text-foreground">Tu perfil está completo.</p>
              {onContinue && (
                <Button onClick={onContinue} className="h-10">
                  Ir a mis exámenes
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {pasosListos} de 3 pasos completados
            </p>
          )}

          <StepCard
            numero={1}
            titulo="Fotografía actualizada"
            descripcion="Se usa para verificar tu identidad cuando presentas tu código QR."
            completo={fotoOk}
          >
            <ProfilePhotoUpload
              fotoUrl={perfil.fotoUrl}
              onUploaded={(fotoUrl) => {
                actualizar({ fotoUrl });
                void refrescar();
              }}
            />
          </StepCard>

          <StepCard
            numero={2}
            titulo="Datos personales"
            descripcion="Tu carnet de identidad y un celular de contacto."
            completo={datosOk}
          >
            <ProfileDataForm ci={perfil.ci} telefono={perfil.telefono} onSaved={(p) => actualizar(p)} />
          </StepCard>

          <StepCard
            numero={3}
            titulo="Nueva contraseña"
            descripcion="Reemplaza la contraseña inicial por una que solo tú conozcas."
            completo={passwordOk}
          >
            <ChangePasswordForm
              onChanged={() => {
                setPasswordCambiada(true);
                void refrescar();
              }}
            />
          </StepCard>
        </div>
      )}
    </PageContainer>
  );
}