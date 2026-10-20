'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, QrCode, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageContainer } from '@/shared/components/layout/PageContainer';
import { useStudentExams } from '../hooks/useStudentExams';
import { ExamCard } from './ExamCard';
import { StudentQrModal } from './StudentQrModal';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentPasswordChangeModal } from './StudentPasswordChangeModal';
import { getMiPerfil } from '../api/student-exam.service';
import type { StudentProfile } from '../types/student-exam.types';

export function StudentExamsView() {
  const { examenes, isLoading, hasError, retry } = useStudentExams();
  const [qrOpen, setQrOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [perfil, setPerfil] = useState<StudentProfile | null>(null);

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001';

  const cargarPerfil = useCallback(async () => {
    try {
      const data = await getMiPerfil();
      setPerfil(data);
    } catch {
      // Si falla o está offline, no interrumpe la vista de exámenes
    }
  }, []);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  const fotoUrl = perfil?.fotoUrl
    ? perfil.fotoUrl.startsWith('http')
      ? perfil.fotoUrl
      : `${backendUrl}${perfil.fotoUrl}`
    : null;

  return (
    <PageContainer
      title="Mis exámenes"
      subtitle="Exámenes en los que estás habilitado para rendir evaluación"
    >
      <div className="flex flex-col gap-6">
        {/* Banner de Perfil y Acciones Rápidas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted transition-transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              title="Haz clic para ver o cambiar tu foto"
            >
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoUrl}
                  alt={perfil?.nombre || 'Foto'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User className="h-7 w-7" />
                </div>
              )}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground sm:text-lg">
                  {perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Estudiante'}
                </h3>
                {perfil?.perfilCompleto ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Perfil Completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Foto pendiente
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                SIS: <span className="font-semibold text-foreground">{perfil?.cod_sis || '—'}</span> · CI: <span className="font-semibold text-foreground">{perfil?.ci || '—'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center">
            <Button
              variant="outline"
              onClick={() => setProfileOpen(true)}
              className="gap-2 text-xs sm:text-sm h-10"
            >
              <Camera className="h-4 w-4 text-primary" />
              Mi foto y perfil
            </Button>

            <Button
              onClick={() => setQrOpen(true)}
              className="gap-2 text-xs sm:text-sm h-10 font-semibold"
            >
              <QrCode className="h-4 w-4" />
              Generar QR
            </Button>
          </div>
        </div>

        {/* Sección de Exámenes */}
        <section aria-live="polite">
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {!isLoading && hasError && (
            <div role="alert" className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-foreground">
                No pudimos cargar tus exámenes. Revisa tu conexión e intenta de nuevo.
              </p>
              <Button variant="outline" onClick={retry} className="mt-4">
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && !hasError && examenes.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No tienes exámenes habilitados por el momento.
            </div>
          )}

          {!isLoading && !hasError && examenes.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {examenes.map((examen) => (
                <ExamCard key={examen.id} examen={examen} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modales integrados */}
      <StudentQrModal open={qrOpen} onClose={() => setQrOpen(false)} />

      <StudentProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onProfileUpdated={() => {
          cargarPerfil();
          retry();
        }}
      />

      {/* Modal forzado si debe cambiar contraseña */}
      {perfil?.debeCambiarPassword && (
        <StudentPasswordChangeModal
          open={perfil.debeCambiarPassword}
          onSuccess={() => {
            cargarPerfil();
            retry();
          }}
        />
      )}
    </PageContainer>
  );
}
