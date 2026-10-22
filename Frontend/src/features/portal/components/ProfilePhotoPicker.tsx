'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { validarDimensionesFoto } from '../lib/validar-foto-dimensiones';
import {
  FOTO_MAX_MB,
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

/** Punto de color que indica el fondo permitido. */
function Muestra({ className }: { className: string }) {
  return <span aria-hidden="true" className={`mx-1 inline-block size-2.5 rounded-full align-middle ${className}`} />;
}

const REQUISITOS: { id: string; contenido: ReactNode }[] = [
  {
    id: 'formato',
    contenido: (
      <>
        Formato <strong className="font-semibold text-foreground">JPG o PNG</strong>, de máximo{' '}
        <strong className="font-semibold text-foreground">{FOTO_MAX_MB} MB</strong>.
      </>
    ),
  },
  {
    id: 'medidas',
    contenido: (
      <>
        Cuadrada, de{' '}
        <strong className="font-semibold text-foreground">
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
        Fondo liso <strong className="font-semibold text-foreground">azul</strong>
        <Muestra className="bg-photo-blue" /> o <strong className="font-semibold text-foreground">rojo</strong>
        <Muestra className="bg-photo-red" />.
      </>
    ),
  },
  {
    id: 'rostro',
    contenido: (
      <>
        Rostro <strong className="font-semibold text-foreground">de frente y centrado</strong>, con los ojos visibles
        (sin lentes oscuros, gorra ni nada que cubra la cara).
      </>
    ),
  },
  {
    id: 'tamano',
    contenido: (
      <>
        El rostro ocupa entre el <strong className="font-semibold text-foreground">50 % y el 69 %</strong> de la altura
        de la foto.
      </>
    ),
  },
  {
    id: 'reciente',
    contenido: (
      <>
        Fotografía <strong className="font-semibold text-foreground">reciente</strong> y a color, sin filtros.
      </>
    ),
  },
];

/** Esquema de referencia con medidas: foto cuadrada y rostro centrado entre el 50 % y el 69 % de la altura. */
function GuiaFoto() {
  return (
    <figure className="mb-4">
      <svg
        viewBox="0 0 290 206"
        role="img"
        aria-label={`Esquema de fotografía válida: ${FOTO_MIN_PX} px por lado y rostro entre el 50 % y el 69 % de la altura`}
        className="mx-auto h-auto w-full max-w-72"
      >
        {/* Foto */}
        <rect x="40" y="34" width="160" height="160" className="fill-muted stroke-border" />

        {/* Silueta */}
        <g className="fill-muted-foreground/40">
          <rect x="108" y="146" width="24" height="24" />
          <path d="M52 194 C52 170 84 162 120 162 C156 162 188 170 188 194 Z" />
          <ellipse cx="120" cy="107" rx="30" ry="45" />
        </g>

        {/* Líneas de medida */}
        <g className="stroke-muted-foreground" strokeWidth="1" fill="none">
          {/* Eje central */}
          <line x1="120" y1="34" x2="120" y2="194" strokeDasharray="4 3" />

          {/* Ancho */}
          <line x1="40" y1="16" x2="200" y2="16" />
          <line x1="40" y1="10" x2="40" y2="22" />
          <line x1="200" y1="10" x2="200" y2="22" />

          {/* Alto */}
          <line x1="20" y1="34" x2="20" y2="194" />
          <line x1="14" y1="34" x2="26" y2="34" />
          <line x1="14" y1="194" x2="26" y2="194" />

          {/* Altura del rostro */}
          <line x1="150" y1="62" x2="220" y2="62" strokeDasharray="2 2" />
          <line x1="150" y1="152" x2="220" y2="152" strokeDasharray="2 2" />
          <line x1="214" y1="62" x2="214" y2="152" />
        </g>

        {/* Textos */}
        <g
          className="fill-muted-foreground stroke-card text-xs"
          strokeWidth="5"
          strokeLinejoin="round"
          paintOrder="stroke"
          textAnchor="middle"
        >
          <text x="120" y="20">
            {FOTO_MIN_PX} px
          </text>
          <text x="20" y="118" transform="rotate(-90 20 114)">
            {FOTO_MIN_PX} px
          </text>
        </g>
        <text x="222" y="111" className="fill-muted-foreground text-xs">
          50 – 69 %
        </text>
      </svg>
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
          className={`flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-5 text-center transition-colors ${
            arrastrando ? 'border-primary bg-muted' : 'border-border bg-muted/30'
          }`}
        >
          {imagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob:/data: no sirven con next/image
            <img
              src={imagen}
              alt="Fotografía del estudiante"
              className="size-40 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex flex-col gap-1">
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
              onClick={() => inputRef.current?.click()}
              disabled={disabled || validando}
              className="h-10 px-4"
            >
              {validando && <Loader2 className="animate-spin" aria-hidden="true" />}
              {imagen ? 'Cambiar fotografía' : 'Elegir fotografía'}
            </Button>
            {file && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLocalError(null);
                  onFileChange(null);
                }}
                disabled={disabled}
                className="h-10 px-4"
              >
                Quitar
              </Button>
            )}
          </div>

          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} · {Math.max(1, Math.round(file.size / 1024))} KB
            </p>
          )}
        </div>

        {mensajeError && <Alert>{mensajeError}</Alert>}
      </div>

      <aside aria-labelledby="foto-requisitos" className="rounded-lg border border-border p-5">
        <h3 id="foto-requisitos" className="text-body mb-3 font-semibold text-primary">
          Requisitos de la fotografía
        </h3>
        <GuiaFoto />
        <ul className="list-disc space-y-2 pl-4 marker:text-muted-foreground">
          {REQUISITOS.map((r) => (
            <li key={r.id} className="text-sm text-muted-foreground">
              {r.contenido}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}