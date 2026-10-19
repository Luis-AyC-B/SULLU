'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { PageContainer } from '@/shared/components/layout/PageContainer';
import { useStudentExams } from '../hooks/useStudentExams';
import { ExamCard } from './ExamCard';
import { StudentQrModal } from './StudentQrModal';

export function StudentExamsView() {
  const { examenes, isLoading, hasError, retry } = useStudentExams();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <PageContainer
      title="Mis exámenes"
      subtitle="Exámenes en los que estás habilitado"
      actionLabel="Generar QR"
      onAction={() => setQrOpen(true)}
    >
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

      <StudentQrModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </PageContainer>
  );
}