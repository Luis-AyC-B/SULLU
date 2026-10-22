'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  QrCode,
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
import { StudentQrModal } from './StudentQrModal';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentPasswordChangeModal } from './StudentPasswordChangeModal';
import { MockScenarioSelector } from './MockScenarioSelector';
import { getMiPerfil } from '../api/student-exam.service';
import type { StudentProfile } from '../types/student-exam.types';
import type { Examen } from '../types/qr-examen';
import { formatearFechaCorta } from '../lib/formato-fechas';

export function StudentExamsView() {
  const {
    examenes,
    isLoading,
    hasError,
    isOffline,
    fechaGuardado,
    retry,
    actualizarExamen,
  } = useStudentExams();

  const [qrPersonalOpen, setQrPersonalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [perfil, setPerfil] = useState<StudentProfile | null>(null);

  // Estado para el modal de QR por examen (Bloque 3)
  const [examenSeleccionado, setExamenSeleccionado] = useState<Examen | null>(null);
  const [examQrModalOpen, setExamQrModalOpen] = useState(false);

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001';

  const verificacionFotoActiva =
    process.env.NEXT_PUBLIC_VERIFICACION_FACIAL_ENABLED !== 'false';

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

  const fechaHoyTexto = useMemo(() => {
    return formatearFechaCorta(new Date().toISOString());
  }, []);

  const handleGenerarQrExamen = (examen: Examen) => {
    setExamenSeleccionado(examen);
    setExamQrModalOpen(true);
  };

  const handleVerQrExamen = (examen: Examen) => {
    setExamenSeleccionado(examen);
    setExamQrModalOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Encabezado Principal Institucional */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-border pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
            MÓDULO DEL ESTUDIANTE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Mis exámenes
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Exámenes en los que estás habilitado para rendir evaluación
          </p>
        </div>
        <div className="text-xs font-medium text-muted-foreground self-start sm:self-end">
          Actualizado {fechaHoyTexto}
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

        {/* Tarjeta de Perfil y Acciones Rápidas */}
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
                  alt={perfil?.nombre || 'Foto de perfil'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User className="h-7 w-7" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {perfil ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : 'Estudiante'}
                </h2>
                {perfil?.perfilCompleto ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Perfil completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    <AlertCircle className="h-3 w-3" />
                    Incompleto
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                SIS: <span className="font-mono">{perfil?.cod_sis || '—'}</span> · Carrera: {perfil?.carrera || 'Ingeniería de Sistemas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfileOpen(true)}
              className="gap-2 text-xs"
            >
              <User className="h-4 w-4" />
              Editar perfil
            </Button>

            <Button
              size="sm"
              onClick={() => setQrPersonalOpen(true)}
              className="gap-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              aria-label="Mi QR personal (Generar QR)"
            >
              <QrCode className="h-4 w-4" />
              Mi QR personal
            </Button>
          </div>
        </div>

        {/* Sección de Exámenes */}
        <section aria-live="polite" className="flex flex-col gap-8">
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {!isLoading && hasError && (
            <div role="alert" className="rounded-xl border border-border bg-card p-8 text-center shadow-xs">
              <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                No pudimos cargar tus exámenes. Revisa tu conexión e intenta de nuevo.
              </p>
              <Button variant="outline" onClick={retry} className="mt-4 text-xs font-semibold">
                Reintentar
              </Button>
            </div>
          )}

          {!isLoading && !hasError && examenes.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                No tienes exámenes habilitados por el momento.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrPersonalOpen(true)}
                className="gap-2 text-xs font-semibold"
              >
                <QrCode className="h-4 w-4" />
                Mi QR personal
              </Button>
            </div>
          )}

          {!isLoading && !hasError && examenes.length > 0 && (
            <>
              {/* Sección: Próximas Evaluaciones */}
              <div>
                <div className="mb-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Próximas evaluaciones
                    </h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {proximas.length} {proximas.length === 1 ? 'examen' : 'exámenes'}
                    </span>
                  </div>

                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Los códigos QR son personales
                  </span>
                </div>

                {proximas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    <p className="mb-3">No tienes evaluaciones próximas.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrPersonalOpen(true)}
                      className="gap-2 text-xs"
                    >
                      <QrCode className="h-4 w-4" />
                      Mi QR personal
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {proximas.map((examen) => (
                      <div key={examen.id} className="h-full">
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

              {/* Sección: Evaluaciones Finalizadas (más discreta) */}
              {finalizadas.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Evaluaciones finalizadas
                    </h3>
                    <span className="rounded-full bg-muted px-2 py-0.2 text-[11px] font-medium text-muted-foreground">
                      {finalizadas.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {finalizadas.map((examen) => (
                      <div key={examen.id} className="h-full">
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
        estudianteNombre={perfil ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : 'Estudiante'}
        estudianteSis={perfil?.cod_sis || '—'}
        onClose={() => setExamQrModalOpen(false)}
        onExamenActualizado={(id, cambios) => {
          actualizarExamen(id, cambios);
        }}
      />

      <StudentQrModal
        open={qrPersonalOpen}
        onClose={() => setQrPersonalOpen(false)}
      />

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

      {/* Selector Flotante de Escenarios (visible únicamente en desarrollo con mock activado) */}
      <MockScenarioSelector onScenarioChange={retry} />
    </div>
  );
}
