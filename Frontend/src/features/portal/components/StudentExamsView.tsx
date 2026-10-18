'use client';

import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useStudentExams } from '../hooks/useStudentExams';
import { ExamCard } from './ExamCard';
import { Header } from '@/shared/components/layout/header';
import { StudentQrModal } from './StudentQrModal';

export function StudentExamsView() {
  const { examenes, isLoading, hasError, retry } = useStudentExams();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <>
      <Header showProfile={false} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-headline text-primary">Mis exámenes</h1>
            <p className="mt-1 text-muted-foreground">Exámenes en los que estás habilitado</p>
          </div>
          <Button onClick={() => setQrOpen(true)} className="h-11 w-full gap-2 px-5 sm:w-auto">
            <QrCode className="h-5 w-5" />
            Generar QR
          </Button>
        </div>

        <section className="mt-6" aria-live="polite">
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {!isLoading && hasError && (
            <div role="alert" className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-foreground">No pudimos cargar tus exámenes. Revisa tu conexión e intenta de nuevo.</p>
              <Button variant="outline" onClick={retry} className="mt-4">
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && !hasError && examenes.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
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
      </main>

      <StudentQrModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  );
}