'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getExamQrService } from '../api/exam-qr.service';
import type { ResultadoValidacionQr } from '../types/qr-examen';
import {
  formatearFechaCorta,
  formatearHora,
} from '../lib/formato-fechas';

interface PublicExamQrViewProps {
  token: string;
}

export function PublicExamQrView({ token }: PublicExamQrViewProps) {
  const searchParams = useSearchParams();
  const mockParam = searchParams.get('mock');

  const [loading, setLoading] = useState(true);
  const [errorConexion, setErrorConexion] = useState(false);
  const [resultado, setResultado] = useState<ResultadoValidacionQr | null>(null);

  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3001';

  const validar = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setResultado({
        esValido: false,
        motivoRechazo: 'INVALIDO',
        mensaje: 'No se proporcionó ningún token de acceso.',
      });
      return;
    }

    setLoading(true);
    setErrorConexion(false);

    try {
      // Soporte para pruebas manuales con query param ?mock=vencido | revocado | invalido | valido
      if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true' && mockParam) {
        if (mockParam === 'vencido') {
          setResultado({
            esValido: false,
            motivoRechazo: 'VENCIDO',
            mensaje: 'El código QR ha expirado porque el examen ya finalizó o superó el tiempo límite de vigencia.',
          });
          setLoading(false);
          return;
        }
        if (mockParam === 'revocado') {
          setResultado({
            esValido: false,
            motivoRechazo: 'REVOCADO',
            mensaje: 'Este código QR fue invalidado porque se generó uno nuevo o cambiaron las credenciales de seguridad del estudiante.',
          });
          setLoading(false);
          return;
        }
        if (mockParam === 'invalido') {
          setResultado({
            esValido: false,
            motivoRechazo: 'INVALIDO',
            mensaje: 'El código QR no corresponde a un examen registrado o la firma digital no es válida.',
          });
          setLoading(false);
          return;
        }
        if (mockParam === 'valido') {
          setResultado({
            esValido: true,
            estudiante: {
              nombre: 'JUAN PÉREZ ROJAS',
              sis: '202001234',
              carrera: 'Ingeniería de Sistemas',
              fotoUrl: null,
            },
            examen: {
              id: 101,
              nombre: 'Primer Parcial - Cálculo II',
              materia: 'Cálculo II',
              grupo: 'Grupo 1',
              ambiente: 'Edif. Nuevo - Aula 691B',
              fecha: new Date().toISOString(),
              horaInicio: '08:15',
              horaFin: '10:15',
              docente: 'Ing. Carlos Mendoza',
              tipoEvaluacion: 'Presencial con verificación biométrica',
            },
            vigenteHasta: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          });
          setLoading(false);
          return;
        }
      }

      const service = await getExamQrService();
      const res = await service.validarTokenQr(token);
      setResultado(res);
    } catch {
      setErrorConexion(true);
    } finally {
      setLoading(false);
    }
  }, [token, mockParam]);

  useEffect(() => {
    validar();
  }, [validar]);

  const fotoSrc = resultado?.estudiante?.fotoUrl
    ? resultado.estudiante.fotoUrl.startsWith('http')
      ? resultado.estudiante.fotoUrl
      : `${backendUrl}${resultado.estudiante.fotoUrl}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Cabecera institucional UMSS */}
      <header className="bg-[#0B1B3D] text-white px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">
                ExaControl <span className="text-red-400">UMSS</span>
              </h1>
              <p className="text-[11px] text-slate-300">
                Verificación de Credencial Digital
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200 border border-white/15">
            HU6-QR
          </span>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#0B1B3D] mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Verificando autenticidad del código QR...
              </p>
              <p className="text-xs text-slate-400">
                Consultando los registros institucionales
              </p>
            </div>
          )}

          {!loading && errorConexion && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Error de conexión
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  No pudimos conectarnos con el servidor para verificar este código QR.
                </p>
              </div>
              <Button
                onClick={validar}
                className="w-full bg-[#0B1B3D] hover:bg-[#122857] text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar verificación
              </Button>
            </div>
          )}

          {!loading && !errorConexion && resultado && (
            <>
              {resultado.esValido ? (
                /* ESTADO: VÁLIDO */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {/* Sello de QR Válido */}
                  <div className="bg-emerald-50 border-b border-emerald-100 p-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      QR VÁLIDO
                    </div>
                    <p className="text-xs text-emerald-700 mt-2 font-medium">
                      {resultado.vigenteHasta
                        ? `Vigente hasta las ${formatearHora(resultado.vigenteHasta)}`
                        : 'Vigente para el examen'}
                    </p>
                  </div>

                  {/* Datos del estudiante (sin CI, sin teléfono, sin correo) */}
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {fotoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fotoSrc}
                          alt="Fotografía del estudiante"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {resultado.estudiante?.nombre || 'Estudiante'}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          SIS: {resultado.estudiante?.sis || '—'}
                        </span>
                      </div>
                      {resultado.estudiante?.carrera && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                          <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{resultado.estudiante.carrera}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detalle del examen */}
                  {resultado.examen && (
                    <div className="p-5 bg-slate-50/60 space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Evaluación asignada
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
                          {resultado.examen.nombre}
                        </h4>
                        {resultado.examen.grupo && (
                          <p className="text-xs text-slate-500 font-medium">
                            {resultado.examen.grupo}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>{formatearFechaCorta(resultado.examen.fecha)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>
                            {resultado.examen.horaInicio || '—'} - {resultado.examen.horaFin || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 col-span-full">
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800">
                            {resultado.examen.ambiente}
                          </span>
                        </div>
                        {resultado.examen.docente && (
                          <div className="flex items-center gap-2 col-span-full">
                            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Docente: {resultado.examen.docente}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pie de seguridad */}
                  <div className="p-3 bg-slate-50 text-center">
                    <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      Código personal e intransferible emitido por ExaControl UMSS
                    </p>
                  </div>
                </div>
              ) : (
                /* ESTADOS DE RECHAZO (Sin datos personales) */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {resultado.motivoRechazo === 'VENCIDO' && (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
                        <Clock className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Este código venció
                        </h2>
                        <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                          {resultado.mensaje ||
                            'El código QR ha expirado porque el examen ya finalizó o superó el tiempo límite de vigencia.'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 border border-slate-200/60">
                        Si necesitas ingresar al aula, consulta con el docente o personal de control responsable.
                      </div>
                    </div>
                  )}

                  {resultado.motivoRechazo === 'REVOCADO' && (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Este código fue revocado
                        </h2>
                        <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                          {resultado.mensaje ||
                            'Este código QR fue invalidado porque se generó uno nuevo o cambiaron las credenciales de seguridad del estudiante.'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 border border-slate-200/60">
                        Genera un nuevo código QR desde el Portal Estudiante o consulta con el personal de control.
                      </div>
                    </div>
                  )}

                  {resultado.motivoRechazo === 'INVALIDO' && (
                    <div className="p-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                        <XCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Código no válido
                        </h2>
                        <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                          {resultado.mensaje ||
                            'El código QR no corresponde a un examen registrado o la firma digital no es válida.'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 border border-slate-200/60">
                        Verifica que el código escaneado sea el correcto o intenta escanearlo nuevamente.
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 text-center">
                    <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      Verificación de seguridad ExaControl UMSS
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

