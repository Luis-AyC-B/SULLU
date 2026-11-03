'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Phone,
  ShieldCheck,
  History,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import {
  getMiPerfil,
  actualizarMiPerfil,
  getHistorialFotos,
} from '../api/student-exam.service';
import type {
  StudentProfile,
  FotoEstudianteItem,
} from '../types/student-exam.types';

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

type TabType = 'foto' | 'historial' | 'datos';

export function StudentProfileModal({
  open,
  onClose,
  onProfileUpdated,
}: StudentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('foto');
  const [perfil, setPerfil] = useState<StudentProfile | null>(null);
  const [historial, setHistorial] = useState<FotoEstudianteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teléfono
  const [telefono, setTelefono] = useState('');

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001';

  // Cargar perfil e historial
  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, h] = await Promise.all([getMiPerfil(), getHistorialFotos()]);
      setPerfil(p);
      setTelefono(p.telefono || '');
      setHistorial(h);
    } catch {
      toast.error('No se pudo cargar la información de tu perfil');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, cargarDatos]);

  // Actualizar teléfono
  const handleGuardarTelefono = async () => {
    if (!telefono || telefono.trim().length < 7) {
      toast.error('Por favor ingresa un número de teléfono o celular válido');
      return;
    }

    setIsSubmitting(true);
    try {
      await actualizarMiPerfil({ telefono: telefono.trim() });
      toast.success('Número de contacto actualizado correctamente');
      onProfileUpdated?.();
      await cargarDatos();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : 'Error al actualizar el teléfono');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fotoActual = perfil?.fotoUrl
    ? /^(http|data:|blob:)/.test(perfil.fotoUrl)
      ? perfil.fotoUrl
      : `${backendUrl}${perfil.fotoUrl}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={true}
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-6"
      >
        <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Mi Perfil de Estudiante
        </DialogTitle>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {/* Cabecera resumen */}
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
                {fotoActual ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoActual}
                    alt={perfil?.nombre || 'Foto de perfil'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-foreground">
                  {perfil?.nombre}
                </h3>
                <p className="text-sm text-muted-foreground">
                  SIS: <span className="font-semibold text-foreground">{perfil?.cod_sis}</span> · CI: <span className="font-semibold text-foreground">{perfil?.ci}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{perfil?.correo}</p>
              </div>

              <div className="flex flex-col items-center sm:items-end gap-1.5">
                {perfil?.perfilCompleto ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Perfil Completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Completa tu perfil
                  </span>
                )}
              </div>
            </div>

            {/* Pestañas de Navegación */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab('foto')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'foto'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Foto de Perfil (Solo Lectura)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'historial'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="h-4 w-4" />
                Historial ({historial.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('datos')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'datos'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Phone className="h-4 w-4" />
                Datos de Contacto
              </button>
            </div>

            {/* Contenido Pestaña 1: Foto Solo Lectura (HU23 Criterio 8) */}
            {activeTab === 'foto' && (
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="relative h-44 w-44 overflow-hidden rounded-2xl border-4 border-primary/20 shadow-md bg-muted">
                  {fotoActual ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoActual}
                      alt={perfil?.nombre || 'Foto de perfil'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <User className="h-20 w-20" />
                    </div>
                  )}
                </div>

                <div className="w-full max-w-md rounded-xl border border-border bg-muted/30 p-4 text-center text-xs space-y-2">
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-foreground text-sm">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Fotografía oficial registrada</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Esta fotografía es tu identificación oficial y única en ExaControl. No puede ser modificada por el estudiante y se utiliza como referencia biométrica para validar tu identidad cada vez que generas el QR de un examen.
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50">
                    Si requieres una corrección por un motivo de fuerza mayor, acude con el personal responsable fuera del sistema.
                  </p>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 2: Historial de Fotos */}
            {activeTab === 'historial' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  Registro cronológico de todas las fotografías asociadas a tu cuenta estudiantil:
                </p>

                {historial.length === 0 ? (
                  <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
                    Aún no tienes fotos registradas en el historial.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {historial.map((f) => {
                      const imgUrl = f.archivo.startsWith('http')
                        ? f.archivo
                        : `${backendUrl}${f.archivo}`;

                      const esActiva = f.estado === 'ACTIVA';
                      const esPendiente = f.estado === 'PENDIENTE';
                      const esRechazada = f.estado === 'RECHAZADA';
                      const esReemplazada = f.estado === 'REEMPLAZADA';

                      const fechaRaw = f.creadoEn || f.creadaEn;
                      const fechaObj = fechaRaw ? new Date(fechaRaw) : null;
                      const esValida = fechaObj && !isNaN(fechaObj.getTime());
                      const fechaFormateada = esValida
                        ? fechaObj.toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Fecha no disponible';

                      return (
                        <div
                          key={f.id}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                            esActiva
                              ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                              : esPendiente
                              ? 'border-amber-400 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                              : esRechazada
                              ? 'border-rose-400 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20'
                              : 'border-border bg-card/60 opacity-80'
                          }`}
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={`Foto ${f.id}`}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="flex-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              {esActiva && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3" />
                                  ACTIVA
                                </span>
                              )}
                              {esPendiente && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <Clock className="h-3 w-3" />
                                  PENDIENTE
                                </span>
                              )}
                              {esRechazada && (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <AlertCircle className="h-3 w-3" />
                                  RECHAZADA
                                </span>
                              )}
                              {esReemplazada && (
                                <span className="inline-flex items-center gap-1 rounded bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
                                  <History className="h-3 w-3" />
                                  REEMPLAZADA
                                </span>
                              )}
                            </div>

                            <p className="text-muted-foreground mt-1 font-medium">
                              {fechaFormateada}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Contenido Pestaña 3: Datos de Contacto */}
            {activeTab === 'datos' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Código SIS</label>
                    <Input value={perfil?.cod_sis || ''} disabled className="mt-1 bg-muted/50" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Cédula de Identidad (CI)</label>
                    <Input value={perfil?.ci || ''} disabled className="mt-1 bg-muted/50" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Correo Institucional</label>
                  <Input value={perfil?.correo || ''} disabled className="mt-1 bg-muted/50" />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">
                    Teléfono / Celular de contacto <span className="text-primary">*</span>
                  </label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej. 71234567"
                      maxLength={15}
                    />
                    <Button
                      onClick={handleGuardarTelefono}
                      disabled={isSubmitting || telefono === perfil?.telefono}
                      className="shrink-0"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este dato es obligatorio para completar tu perfil estudiantil.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
