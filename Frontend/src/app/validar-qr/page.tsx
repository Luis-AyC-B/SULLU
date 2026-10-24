'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  Loader2,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { apiClient } from '@/shared/lib/api-client';

interface ExamenAsignado {
  id: number;
  nombre: string;
  ambiente: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
}

interface DatosValidacion {
  estado: 'VALIDO' | 'EXPIRADO' | 'REVOCADO' | 'INVALIDO';
  mensaje: string;
  nombre?: string;
  sis?: string;
  carrera?: string;
  fotoUrl?: string | null;
  examenes?: ExamenAsignado[];
}

export function ContenidoValidarQr({ tokenOverride }: { tokenOverride?: string }) {
  const searchParams = useSearchParams();
  const token = tokenOverride || searchParams.get('token');
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [datos, setDatos] = useState<DatosValidacion | null>(null);
  const [isRegistrando, setIsRegistrando] = useState(false);
  const [ingresoRegistrado, setIngresoRegistrado] = useState(false);

  const getBackendUrl = () => {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return `http://${window.location.hostname}:3001`;
    }
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3001'
    );
  };

  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');

  useEffect(() => {
    setBackendUrl(getBackendUrl());
  }, []);

  const consultarToken = async () => {
    if (!token) {
      setIsLoading(false);
      setDatos({
        estado: 'INVALIDO',
        mensaje: 'No se proporcionó ningún token de acceso en el enlace escaneado.',
      });
      return;
    }

    setIsLoading(true);
    setIsNetworkError(false);
    const url = getBackendUrl();

    try {
      const res = await axios.get<DatosValidacion>(`${url}/qr/validar`, {
        params: { token },
        headers: { 'Cache-Control': 'no-store' },
      });
      setDatos(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: DatosValidacion; status?: number } };
      if (axiosErr.response?.data?.estado) {
        setDatos(axiosErr.response.data);
      } else {
        setIsNetworkError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    consultarToken();
  }, [token]);

  // Manejo de registro directo por personal de control autenticado
  const puedeRegistrarIngreso =
    session?.user &&
    datos?.estado === 'VALIDO' &&
    !ingresoRegistrado &&
    ((session.user.permisos as string[])?.includes('registro_ingresos') ||
      (session.user as { rol?: string }).rol?.toUpperCase() === 'DOCENTE' ||
      (session.user as { rol?: string }).rol?.toUpperCase() === 'ADMINISTRADOR');

  const handleRegistrarIngreso = async () => {
    if (!token) return;
    setIsRegistrando(true);
    try {
      await apiClient.post('/ingresos/qr', { token });
      setIngresoRegistrado(true);
      toast.success('Ingreso del estudiante registrado correctamente');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Error al registrar ingreso';
      toast.error(msg);
    } finally {
      setIsRegistrando(false);
    }
  };

  const fotoSrc = datos?.fotoUrl
    ? datos.fotoUrl.startsWith('http')
      ? datos.fotoUrl
      : `${backendUrl}${datos.fotoUrl}`
    : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-all">
        {/* Encabezado Institucional Requerido */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-5 py-4 text-white text-center">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h1 className="text-sm font-bold tracking-wider uppercase">
              EXACONTROL · UMSS
            </h1>
          </div>
          <p className="text-xs text-blue-100 font-medium tracking-wide mt-0.5">
            Credencial digital de acceso
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {/* 1. Cargando */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Verificando credencial digital...
              </p>
            </div>
          )}

          {/* 2. Error de Red */}
          {!isLoading && isNetworkError && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Error de Conexión
              </h2>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                No pudimos conectar con el servidor de validación. Verifica que tu dispositivo esté conectado a la misma red o reintenta.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={consultarToken}
                className="mt-4 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          )}

          {/* 3. Estados No Válidos (EXPIRADO, REVOCADO, INVALIDO) */}
          {!isLoading && !isNetworkError && datos && datos.estado !== 'VALIDO' && (
            <div className="flex flex-col items-center text-center py-6">
              {datos.estado === 'EXPIRADO' ? (
                <div className="h-16 w-16 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mb-3">
                  <Clock className="h-9 w-9" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-500/15 text-red-600 flex items-center justify-center mb-3">
                  <XCircle className="h-9 w-9" />
                </div>
              )}

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {datos.estado === 'EXPIRADO'
                  ? 'Código QR Expirado'
                  : datos.estado === 'REVOCADO'
                  ? 'Código QR Ya Utilizado / Revocado'
                  : 'Código QR No Válido'}
              </h2>

              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                {datos.mensaje}
              </p>

              <div className="mt-6 w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-3.5 text-left text-xs text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Instrucciones:
                </p>
                <p className="mt-1">
                  El estudiante debe ingresar a su portal web y generar una credencial QR vigente para ingresar al examen.
                </p>
              </div>
            </div>
          )}

          {/* 4. Estado VÁLIDO (Credencial Digital Completa) */}
          {!isLoading && !isNetworkError && datos && datos.estado === 'VALIDO' && (
            <div className="flex flex-col items-center text-center">
              {/* Badge de Verificación */}
              <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-3 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider mb-5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Credencial Verificada y Activa
              </div>

              {/* Fotografía de perfil del estudiante */}
              <div className="relative h-36 w-36 overflow-hidden rounded-2xl border-4 border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 mb-4">
                {fotoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoSrc}
                    alt={datos.nombre || 'Foto del estudiante'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                    <User className="h-16 w-16" />
                    <span className="text-[10px] mt-1 font-medium">Sin foto activa</span>
                  </div>
                )}
              </div>

              {/* Nombre completo y SIS */}
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {datos.nombre}
              </h2>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>SIS:</span>
                <span className="text-primary font-bold">{datos.sis}</span>
              </div>

              {datos.carrera && (
                <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {datos.carrera}
                </p>
              )}

              {/* Exámenes asignados / habilitados */}
              {datos.examenes && datos.examenes.length > 0 && (
                <div className="mt-5 w-full text-left">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Exámenes Habilitados ({datos.examenes.length})
                  </h3>
                  <div className="space-y-2">
                    {datos.examenes.map((ex) => (
                      <div
                        key={ex.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-800/40 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span className="line-clamp-1">{ex.nombre}</span>
                          <span className="ml-2 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">
                            {ex.estado}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" /> {ex.ambiente}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" /> {ex.fecha} ({ex.horaInicio} - {ex.horaFin})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón opcional para Personal de Control */}
              {puedeRegistrarIngreso && (
                <div className="mt-5 w-full">
                  <Button
                    onClick={handleRegistrarIngreso}
                    disabled={isRegistrando}
                    className="w-full h-11 gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isRegistrando ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registrando ingreso...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        Registrar Ingreso de Estudiante
                      </>
                    )}
                  </Button>
                </div>
              )}

              {ingresoRegistrado && (
                <div className="mt-4 w-full rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-xs font-semibold text-emerald-800">
                  ✅ Ingreso registrado exitosamente en el sistema de control.
                </div>
              )}

              {/* Leyenda Requerida */}
              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 w-full">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Código personal e intransferible. Preséntalo al personal de control para registrar tu ingreso.
                </p>
              </div>

              {/* Pie Requerido */}
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                Universidad Mayor de San Simón · Control de Ingreso a Exámenes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ValidarQrPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <ContenidoValidarQr />
    </Suspense>
  );
}
