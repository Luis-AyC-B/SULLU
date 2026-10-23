'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  History,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  RefreshCw,
  Loader2,
  CameraOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import {
  getMiPerfil,
  actualizarMiPerfil,
  subirMiFoto,
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

interface FeedbackFoto {
  tipo: 'ACTIVA' | 'PENDIENTE' | 'RECHAZADA';
  titulo: string;
  mensaje: string;
}

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
  const [feedback, setFeedback] = useState<FeedbackFoto | null>(null);

  // Teléfono
  const [telefono, setTelefono] = useState('');

  // Modo de foto: 'subir' | 'camara'
  const [modoFoto, setModoFoto] = useState<'subir' | 'camara'>('subir');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [previewSeleccion, setPreviewSeleccion] = useState<string | null>(null);

  // Cámara web
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActiva, setCameraActiva] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<Blob | null>(null);
  const [previewCaptura, setPreviewCaptura] = useState<string | null>(null);

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
      toast.error('No se pudo cargar la información del perfil');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      cargarDatos();
    } else {
      detenerCamara();
      setArchivoSeleccionado(null);
      setPreviewSeleccion(null);
      setFotoCapturada(null);
      setPreviewCaptura(null);
      setModoFoto('subir');
      setFeedback(null);
    }
  }, [open, cargarDatos]);

  // Manejo de Cámara
  const iniciarCamara = async () => {
    setCameraError(null);
    setFotoCapturada(null);
    setPreviewCaptura(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador o dispositivo no soporta captura por cámara web.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActiva(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador.'
          : 'No se pudo acceder a la cámara web.';
      setCameraError(msg);
      setCameraActiva(false);
    }
  };

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActiva(false);
  };

  const capturarFoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setFotoCapturada(blob);
          setPreviewCaptura(URL.createObjectURL(blob));
          detenerCamara();
        }
      },
      'image/jpeg',
      0.9,
    );
  };

  const reintentarCaptura = () => {
    setFotoCapturada(null);
    setPreviewCaptura(null);
    iniciarCamara();
  };

  // Manejo de archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Solo se permiten archivos de imagen JPG, PNG o WEBP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 2MB');
      return;
    }

    setArchivoSeleccionado(file);
    setPreviewSeleccion(URL.createObjectURL(file));
  };

  // Subir foto (archivo o captura) con feedback biométrico completo
  const handleGuardarFoto = async () => {
    const foto = modoFoto === 'subir' ? archivoSeleccionado : fotoCapturada;
    if (!foto) {
      toast.error('Debes seleccionar o capturar una foto antes de continuar');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const resp = await subirMiFoto(foto);

      if (resp.estado === 'ACTIVA') {
        const msg = resp.message || 'Foto de perfil actualizada correctamente';
        setFeedback({
          tipo: 'ACTIVA',
          titulo: '✅ Foto de perfil actualizada correctamente',
          mensaje: msg,
        });
        toast.success(msg);
        setArchivoSeleccionado(null);
        setPreviewSeleccion(null);
        setFotoCapturada(null);
        setPreviewCaptura(null);
        detenerCamara();
        await cargarDatos();
        onProfileUpdated?.();
      } else if (resp.estado === 'PENDIENTE') {
        const msg =
          resp.message ||
          'Tu foto ha sido enviada a revisión manual por un docente o administrador';
        setFeedback({
          tipo: 'PENDIENTE',
          titulo: '⚠️ Foto enviada a revisión manual',
          mensaje: msg,
        });
        toast.warning(msg);
        setArchivoSeleccionado(null);
        setPreviewSeleccion(null);
        setFotoCapturada(null);
        setPreviewCaptura(null);
        detenerCamara();
        // Se actualiza el historial para reflejar el nuevo estado PENDIENTE sin cambiar el avatar activo
        await cargarDatos();
      } else if (resp.estado === 'RECHAZADA') {
        const msg =
          resp.message ||
          'La imagen no coincide con la identidad registrada del estudiante';
        setFeedback({
          tipo: 'RECHAZADA',
          titulo:
            '❌ Fotografía no admitida: La imagen no coincide con la identidad registrada del estudiante',
          mensaje: msg,
        });
        toast.error(
          '❌ Fotografía no admitida: La imagen no coincide con la identidad registrada del estudiante',
        );
        // La foto activa no cambia y el modal no se cierra
        await cargarDatos();
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : 'Error al procesar la foto');

      setFeedback({
        tipo: 'RECHAZADA',
        titulo: '❌ Fotografía no admitida',
        mensaje: errorMsg,
      });
      toast.error(`❌ Fotografía no admitida: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar teléfono
  const handleGuardarTelefono = async () => {
    if (!telefono.trim()) {
      toast.error('Ingresa un número de teléfono válido');
      return;
    }

    setIsSubmitting(true);
    try {
      await actualizarMiPerfil({ telefono: telefono.trim() });
      toast.success('Teléfono actualizado correctamente');
      await cargarDatos();
      onProfileUpdated?.();
    } catch {
      toast.error('Error al actualizar el teléfono');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fotoActual = perfil?.fotoUrl
    ? perfil.fotoUrl.startsWith('http')
      ? perfil.fotoUrl
      : `${backendUrl}${perfil.fotoUrl}`
    : null;

  const tieneFotoPendiente = historial.some((f) => f.estado === 'PENDIENTE');

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
{perfil?.nombre}                </h3>
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
                {tieneFotoPendiente && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                    <Clock className="h-3 w-3" />
                    Foto en revisión
                  </span>
                )}
              </div>
            </div>

            {/* Pestañas de Navegación */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => {
                  detenerCamara();
                  setActiveTab('foto');
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'foto'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="h-4 w-4" />
                Foto de Perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  detenerCamara();
                  setActiveTab('historial');
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'historial'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="h-4 w-4" />
                Historial de Fotos ({historial.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  detenerCamara();
                  setActiveTab('datos');
                }}
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

            {/* Contenido Pestaña 1: Foto y Captura */}
            {activeTab === 'foto' && (
              <div className="flex flex-col gap-5">
                {/* Alerta/Toast de Feedback In-Modal */}
                {feedback && (
                  <div
                    role="alert"
                    className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm transition-all ${
                      feedback.tipo === 'ACTIVA'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                        : feedback.tipo === 'PENDIENTE'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                        : 'border-destructive/40 bg-destructive/15 text-destructive dark:bg-destructive/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {feedback.tipo === 'ACTIVA' && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                      )}
                      {feedback.tipo === 'PENDIENTE' && (
                        <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                      )}
                      {feedback.tipo === 'RECHAZADA' && (
                        <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold flex items-center gap-1.5">
                          {feedback.titulo}
                        </p>
                        <p className="text-xs mt-1 opacity-90 leading-relaxed">
                          {feedback.mensaje}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      className="text-xs font-bold opacity-60 hover:opacity-100 p-1"
                      aria-label="Cerrar notificación"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {tieneFotoPendiente && !feedback && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
                    <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Solicitud de cambio de foto pendiente</p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Ya enviaste una nueva fotografía. Tu foto activa actual sigue vigente hasta la aprobación o validación docente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Selector de modo: Archivo vs Cámara */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={modoFoto === 'subir' ? 'default' : 'outline'}
                    onClick={() => {
                      detenerCamara();
                      setModoFoto('subir');
                    }}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Subir archivo (JPG/PNG)
                  </Button>
                  <Button
                    type="button"
                    variant={modoFoto === 'camara' ? 'default' : 'outline'}
                    onClick={() => {
                      setModoFoto('camara');
                      iniciarCamara();
                    }}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Tomar con cámara
                  </Button>
                </div>

                {/* Modo Subir Archivo */}
                {modoFoto === 'subir' && (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center">
                    {previewSeleccion ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-44 w-44 overflow-hidden rounded-xl border border-border shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewSeleccion}
                            alt="Vista previa"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {archivoSeleccionado?.name} ({(archivoSeleccionado?.size ? archivoSeleccionado.size / 1024 : 0).toFixed(1)} KB)
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setArchivoSeleccionado(null);
                            setPreviewSeleccion(null);
                          }}
                        >
                          Cambiar imagen
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground/60 mb-2" />
                        <p className="text-sm font-medium text-foreground">
                          Selecciona una fotografía de frente y con buena iluminación
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          Formatos aceptados: JPG, PNG o WEBP (Exactamente 1 rostro, máx. 2MB)
                        </p>
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                            Elegir archivo
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}

                {/* Modo Cámara Web */}
                {modoFoto === 'camara' && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-black/5 dark:bg-black/20 p-4">
                    {cameraError ? (
                      <div className="flex flex-col items-center gap-3 py-8 text-center text-destructive">
                        <CameraOff className="h-10 w-10" />
                        <p className="text-sm font-medium">{cameraError}</p>
                        <Button variant="outline" size="sm" onClick={iniciarCamara} className="gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Reintentar conexión
                        </Button>
                      </div>
                    ) : previewCaptura ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-56 w-56 overflow-hidden rounded-xl border-2 border-primary shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewCaptura}
                            alt="Foto capturada"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Captura lista para enviar</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={reintentarCaptura}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Tomar otra captura
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative h-60 w-80 overflow-hidden rounded-xl bg-black shadow-inner">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={capturarFoto}
                          disabled={!cameraActiva}
                          className="gap-2 h-11 px-6 font-semibold"
                        >
                          <Camera className="h-5 w-5" />
                          Capturar Fotografía
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Botón de acción Guardar */}
                <Button
                  onClick={handleGuardarFoto}
                  disabled={
                    isSubmitting ||
                    (modoFoto === 'subir' && !archivoSeleccionado) ||
                    (modoFoto === 'camara' && !fotoCapturada)
                  }
                  className="h-11 w-full gap-2 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando y validando fotografía...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Guardar Foto de Perfil
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Contenido Pestaña 2: Historial de Fotos con badges requeridos */}
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

                      // Formateo seguro para eliminar "Invalid Date"
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
                              {/* 1. ACTIVA (Verde) */}
                              {esActiva && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3" />
                                  ACTIVA
                                </span>
                              )}

                              {/* 2. PENDIENTE (Amarillo) */}
                              {esPendiente && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <Clock className="h-3 w-3" />
                                  PENDIENTE
                                </span>
                              )}

                              {/* 3. RECHAZADA (Rojo) */}
                              {esRechazada && (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <AlertCircle className="h-3 w-3" />
                                  RECHAZADA
                                </span>
                              )}

                              {/* 4. REEMPLAZADA (Gris) */}
                              {esReemplazada && (
                                <span className="inline-flex items-center gap-1 rounded bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
                                  <History className="h-3 w-3" />
                                  REEMPLAZADA
                                </span>
                              )}

                              {!esActiva && !esPendiente && !esRechazada && !esReemplazada && (
                                <span className="rounded bg-muted text-muted-foreground px-1.5 py-0.5 text-[11px] font-medium">
                                  {f.estado}
                                </span>
                              )}
                            </div>

                            <p className="text-muted-foreground mt-1 font-medium">
                              {fechaFormateada}
                            </p>

                            {f.similitud !== null && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                Similitud: {(f.similitud * 100).toFixed(0)}%
                              </p>
                            )}
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
