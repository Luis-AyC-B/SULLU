'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useStudentExams } from '../hooks/useStudentExams';
import { ExamCard } from './ExamCard';
import { ExamQrModal } from './ExamQrModal';
import { StudentPasswordChangeModal } from './StudentPasswordChangeModal';
import { MockScenarioSelector } from './MockScenarioSelector';
import { getMiPerfil } from '../api/student-exam.service';
import type { StudentProfile } from '../types/student-exam.types';
import type { Examen } from '../types/qr-examen';
import { guardarPerfilOffline, obtenerPerfilOffline } from '../lib/offline-portal';

// Grid que se adapta al ancho disponible (no al ancho de la pantalla)
const GRID_EXAMENES =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] items-stretch gap-4';

export function StudentExamsView() {
  const {
    examenes,
    verificacionFotoActiva,
    isLoading,
    hasError,
    isOffline,
    fechaGuardado,
    retry,
    actualizarExamen,
  } = useStudentExams();

  const [perfil, setPerfil] = useState<StudentProfile | null>(null);

  // Estado para el modal de QR por examen (Bloque 3)
  const [examenSeleccionado, setExamenSeleccionado] = useState<Examen | null>(null);
  const [examQrModalOpen, setExamQrModalOpen] = useState(false);

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001';

  const cargarPerfil = useCallback(async () => {
    try {
      const data = await getMiPerfil();
      setPerfil(data);
      guardarPerfilOffline(data);
    } catch {
      // Sin conexión: se muestra el último perfil guardado. Se desactiva el modal de
      // cambio de contraseña porque no se puede completar sin red.
      const cached = obtenerPerfilOffline();
      if (cached) setPerfil({ ...cached.data, debeCambiarPassword: false });
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

  // Separación de evaluaciones próximas vs finalizadas
  const { proximas, finalizadas } = useMemo(() => {
    const prox: Examen[] = [];
    const fin: Examen[] = [];

    examenes.forEach((ex) => {
      if (ex.estadoQr === 'FINALIZADO') {
        fin.push(ex);
      } else {
        prox.push(ex);
      }
    });

    // Orden ascendente por fecha de inicio para próximas evaluaciones
    prox.sort(
      (a, b) =>
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
    );

    return { proximas: prox, finalizadas: fin };
  }, [examenes]);

  const [minutosActualizado, setMinutosActualizado] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setMinutosActualizado((m) => m + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const textoActualizado = useMemo(() => {
    return `Actualizado hace ${minutosActualizado} min`;
  }, [minutosActualizado]);

  const handleGenerarQrExamen = (examen: Examen) => {
    setExamenSeleccionado(examen);
    setExamQrModalOpen(true);
  };

  const handleVerQrExamen = (examen: Examen) => {
    setExamenSeleccionado(examen);
    setExamQrModalOpen(true);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Encabezado principal */}
      <div className="mb-6 flex flex-col justify-between gap-2 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Mis exámenes
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Exámenes en los que estás habilitado para rendir evaluación
          </p>
        </div>
        <div className="self-start text-xs font-medium text-muted-foreground sm:self-end">
          {textoActualizado}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Banner de aviso offline si no hay conexión */}
        {isOffline && fechaGuardado && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-medium text-amber-900 shadow-2xs"
          >
            <WifiOff className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              Estás sin conexión, mostrando datos guardados el {fechaGuardado}.
            </span>
          </div>
        )}

        {/* Tarjeta de perfil (solo informativa) */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoUrl}
                  alt={perfil?.nombre || 'Foto de perfil'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User className="h-7 w-7" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="break-words text-base font-bold text-foreground">
                  {perfil ? perfil.nombre : 'Estudiante'}
                </h2>
                {perfil?.perfilCompleto ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Perfil completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <AlertCircle className="h-3 w-3" />
                    Incompleto
                  </span>
                )}
              </div>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                SIS: <span className="font-mono">{perfil?.cod_sis || '—'}</span>{' '}
                · Carrera: {perfil?.carrera || 'Ingeniería de Sistemas'}
              </p>
            </div>
          </div>
        </div>

        {/* Sección de exámenes */}
        <section aria-live="polite" className="flex flex-col gap-8">
          {isLoading && (
            <div className={GRID_EXAMENES} aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {!isLoading && hasError && (
            <div
              role="alert"
              className="rounded-xl border border-border bg-card p-8 text-center shadow-xs"
            >
              <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
              <p className="text-sm font-medium text-foreground">
                No pudimos cargar tus exámenes. Revisa tu conexión e intenta de
                nuevo.
              </p>
              <Button
                variant="outline"
                onClick={retry}
                className="mt-4 text-xs font-semibold"
              >
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && !hasError && examenes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No tienes exámenes habilitados por el momento.
              </p>
            </div>
          )}

          {!isLoading && !hasError && examenes.length > 0 && (
            <>
              {/* Sección: Próximos y recientes */}
              <div>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Próximos y recientes
                    </h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {proximas.length}{' '}
                      {proximas.length === 1 ? 'examen' : 'exámenes'}
                    </span>
                  </div>

                  <span className="hidden items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                    Los códigos se habilitan 24 horas antes.
                  </span>
                </div>

                {proximas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    <p>No tienes evaluaciones próximas.</p>
                  </div>
                ) : (
                  <div className={GRID_EXAMENES}>
                    {proximas.map((examen) => (
                      <div key={examen.id} className="h-full min-w-0">
                        <ExamCard
                          examen={examen}
                          isOffline={isOffline}
                          onGenerarQr={handleGenerarQrExamen}
                          onVerQr={handleVerQrExamen}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección: Evaluaciones finalizadas (más discreta) */}
              {finalizadas.length > 0 && (
                <div className="border-t border-border/60 pt-2">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Evaluaciones finalizadas
                    </h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {finalizadas.length}
                    </span>
                  </div>

                  <div className={GRID_EXAMENES}>
                    {finalizadas.map((examen) => (
                      <div key={examen.id} className="h-full min-w-0">
                        <ExamCard
                          examen={examen}
                          isOffline={isOffline}
                          onGenerarQr={handleGenerarQrExamen}
                          onVerQr={handleVerQrExamen}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Modales integrados */}
      <ExamQrModal
        open={examQrModalOpen}
        examen={examenSeleccionado}
        verificacionFotoActiva={verificacionFotoActiva}
        fotoPerfilUrl={fotoUrl}
        estudianteNombre={
          perfil
            ? `${perfil.nombre} ${perfil.apellido || ''}`.trim()
            : 'Estudiante'
        }
        estudianteSis={perfil?.cod_sis || '—'}
        onClose={() => setExamQrModalOpen(false)}
        onExamenActualizado={(id, cambios) => {
          actualizarExamen(id, cambios);
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

      {/* Selector flotante de escenarios (solo desarrollo con mock activado) */}
      <MockScenarioSelector onScenarioChange={retry} />
    </div>
  );
}