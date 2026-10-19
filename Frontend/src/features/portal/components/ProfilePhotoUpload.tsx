'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { subirFotoPerfil } from '../api/student-profile.service';
import { mensajePerfilError } from '../lib/perfil-errors';
import {
  FOTO_MAX_BYTES,
  FOTO_TIPOS_PERMITIDOS,
  validarFoto,
} from '../types/student-profile.types';

interface ProfilePhotoUploadProps {
  /** Fotografía vigente del estudiante, si ya subió una. */
  fotoUrl?: string | null;
  /** Se llama con la nueva URL cuando la subida termina bien. */
  onUploaded: (fotoUrl: string) => void;
  disabled?: boolean;
}

const ACCEPT = FOTO_TIPOS_PERMITIDOS.join(',');
const MAX_MB = FOTO_MAX_BYTES / (1024 * 1024);

export function ProfilePhotoUpload({ fotoUrl, onUploaded, disabled = false }: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Libera la URL temporal de la vista previa al cambiarla o al desmontar.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const imagen = previewUrl ?? fotoUrl ?? null;
  const hayPendiente = file !== null;

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de un error o cancelación.
    e.target.value = '';
    if (!selected) return;

    const mensaje = validarFoto(selected);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const { fotoUrl: nueva } = await subirFotoPerfil(file);
      setFile(null);
      setPreviewUrl(null);
      onUploaded(nueva);
    } catch (err) {
      // Se conserva el archivo elegido para poder reintentar sin volver a seleccionarlo.
      setError(mensajePerfilError(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-border bg-muted"
        aria-busy={isUploading}
      >
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob:/data: no sirven con next/image
          <img src={imagen} alt="Fotografía del estudiante" className="h-full w-full object-cover" />
        ) : (
          <User className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

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

      {hayPendiente ? (
        <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row">
          <Button onClick={handleUpload} disabled={disabled || isUploading} className="h-11 flex-1 gap-2">
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isUploading ? 'Subiendo…' : 'Subir fotografía'}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
            className="h-11 flex-1 text-primary"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="h-11 w-full max-w-xs gap-2 text-primary"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          {fotoUrl ? 'Cambiar fotografía' : 'Elegir fotografía'}
        </Button>
      )}

      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Usa una fotografía actualizada, con tu rostro visible. JPG o PNG, máximo {MAX_MB} MB.
      </p>

      {error && (
        <p role="alert" className="max-w-xs text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}