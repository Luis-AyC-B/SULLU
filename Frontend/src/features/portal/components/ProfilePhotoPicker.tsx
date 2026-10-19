'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, Camera, CheckCircle2, ImagePlus, Info, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { AVISO_ERROR, BTN_PELIGRO, BTN_PRIMARIO, BTN_SECUNDARIO } from '../lib/estilos-perfil';
import { validarDimensionesFoto } from '../lib/validar-foto-dimensiones';
import {
  FOTO_MAX_KB,
  FOTO_MIN_PX,
  FOTO_TIPOS_PERMITIDOS,
  validarFoto,
} from '../types/student-profile.types';

interface ProfilePhotoPickerProps {
  /** Fotografía que el estudiante ya tiene guardada, si existe. */
  fotoActualUrl?: string | null;
  /** Archivo elegido y válido, todavía sin subir. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Error que viene del formulario (foto obligatoria, rechazo del servidor). */
  error?: string | null;
  disabled?: boolean;
}

const ACCEPT = FOTO_TIPOS_PERMITIDOS.join(',');
const AZUL = '#003770';
const ROJO = '#D3101E';

function Muestra({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="mx-0.5 inline-block h-3 w-3 rounded-full border border-border align-middle"
      style={{ backgroundColor: color }}
    />
  );
}

const REQUISITOS: { id: string; contenido: ReactNode }[] = [
  {
    id: 'formato',
    contenido: (
      <>
        Formato <strong className="text-foreground">JPG o PNG</strong>, de máximo{' '}
        <strong className="text-foreground">{FOTO_MAX_KB} KB</strong>.
      </>
    ),
  },
  {
    id: 'medidas',
    contenido: (
      <>
        Cuadrada, de{' '}
        <strong className="text-foreground">
          {FOTO_MIN_PX} × {FOTO_MIN_PX} px
        </strong>{' '}
        como mínimo.
      </>
    ),
  },
  {
    id: 'fondo',
    contenido: (
      <>
        Fondo liso <strong className="text-foreground">azul</strong>
        <Muestra color={AZUL} /> o <strong className="text-foreground">rojo</strong>
        <Muestra color={ROJO} />.
      </>
    ),
  },
  {
    id: 'rostro',
    contenido: (
      <>
        Rostro <strong className="text-foreground">de frente y centrado</strong>, con los ojos visibles (sin lentes
        oscuros, gorra ni nada que cubra la cara).
      </>
    ),
  },
  {
    id: 'tamano',
    contenido: (
      <>
        El rostro ocupa entre el <strong className="text-foreground">50 % y el 69 %</strong> de la altura de la foto.
      </>
    ),
  },
  {
    id: 'reciente',
    contenido: (
      <>
        Fotografía <strong className="text-foreground">reciente</strong> y a color, sin filtros.
      </>
    ),
  },
];

/** Esquema de referencia: fondo liso, rostro centrado y de frente. */
function GuiaFoto({ fondo, etiqueta }: { fondo: string; etiqueta: string }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label={`Esquema de fotografía válida con ${etiqueta.toLowerCase()}`}
        className="h-28 w-28 overflow-hidden rounded-lg shadow-sm"
      >
        <rect width="160" height="160" fill={fondo} />
        <path d="M24 160 C24 122 52 110 80 110 C108 110 136 122 136 160 Z" fill="#cbd5e1" />
        <ellipse cx="80" cy="74" rx="27" ry="36" fill="#e2e8f0" />
        <line x1="80" y1="0" x2="80" y2="160" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
      </svg>
      <figcaption className="text-xs font-medium text-muted-foreground">{etiqueta}</figcaption>
    </figure>
  );
}

export function ProfilePhotoPicker({
  fotoActualUrl,
  file,
  onFileChange,
  error,
  disabled = false,
}: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  // Vista previa del archivo elegido; se libera la URL temporal al cambiarlo o al desmontar.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const procesar = async (selected: File | undefined) => {
    if (!selected) return;
    setLocalError(null);
    setValidando(true);
    try {
      const mensaje = validarFoto(selected) ?? (await validarDimensionesFoto(selected));
      if (mensaje) {
        setLocalError(mensaje);
        return;
      }
      onFileChange(selected);
    } finally {
      setValidando(false);
    }
  };

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de un error.
    e.target.value = '';
    void procesar(selected);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (disabled) return;
    void procesar(e.dataTransfer.files?.[0]);
  };

  const imagen = previewUrl ?? fotoActualUrl ?? null;
  const mensajeError = localError ?? error ?? null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          className={`flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
            arrastrando
              ? 'border-primary bg-primary/10'
              : 'border-primary/30 bg-primary/5 hover:border-primary/60'
          }`}
        >
          {imagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob:/data: no sirven con next/image
            <img
              src={imagen}
              alt="Fotografía del estudiante"
              className="h-44 w-44 rounded-xl object-cover shadow-md ring-4 ring-white"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImagePlus className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-foreground">Arrastra y suelta aquí tu fotografía</p>
              <p className="text-xs text-muted-foreground">o elige un archivo de tu dispositivo</p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleSelect}
            className="sr-only"
            tabIndex={-1}
            aria-label="Seleccionar fotografía"
            data-testid="foto-input"
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant={imagen ? 'outline' : 'default'}
              onClick={() => inputRef.current?.click()}
              disabled={disabled || validando}
              className={`h-11 ${imagen ? BTN_SECUNDARIO : BTN_PRIMARIO}`}
            >
              {validando ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-4 w-4" aria-hidden="true" />
              )}
              {imagen ? 'Cambiar fotografía' : 'Elegir fotografía'}
            </Button>
            {file && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setLocalError(null);
                  onFileChange(null);
                }}
                disabled={disabled}
                className={`h-11 ${BTN_PELIGRO}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Quitar
              </Button>
            )}
          </div>

          {file && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              {file.name} · {Math.max(1, Math.round(file.size / 1024))} KB
            </p>
          )}
        </div>

        {mensajeError && (
          <p role="alert" className={AVISO_ERROR}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{mensajeError}</span>
          </p>
        )}
      </div>

      <aside
        aria-labelledby="foto-requisitos"
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
      >
        <h3 id="foto-requisitos" className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
          <Info className="h-4 w-4" aria-hidden="true" />
          Requisitos de la fotografía
        </h3>
        <div className="flex justify-center gap-4">
          <GuiaFoto fondo={AZUL} etiqueta="Fondo azul" />
          <GuiaFoto fondo={ROJO} etiqueta="Fondo rojo" />
        </div>
        <ul className="mt-4 space-y-2.5">
          {REQUISITOS.map((r) => (
            <li key={r.id} className="flex gap-2 text-sm leading-snug text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{r.contenido}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}