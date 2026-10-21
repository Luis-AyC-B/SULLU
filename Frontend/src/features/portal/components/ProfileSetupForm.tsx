'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import {
  cambiarPassword,
  guardarDatosPerfil,
  PerfilError,
  subirFotoPerfil,
} from '../api/student-profile.service';
import { mensajePerfilError } from '../lib/perfil-errors';
import {
  configurarPerfilSchema,
  PASSWORD_MAX,
  PASSWORD_MIN,
  type ConfigurarPerfilValues,
  type PerfilEstudiante,
} from '../types/student-profile.types';
import { PasswordField } from './PasswordField';
import { ProfilePhotoPicker } from './ProfilePhotoPicker';
import { ProfileTextField } from './ProfileTextField';

interface ProfileSetupFormProps {
  perfil: PerfilEstudiante;
  /** Se llama cuando todo se guardó bien (la navegación la define quien use el formulario). */
  onCompleted: () => void;
}

interface SeccionProps {
  id: string;
  paso: number;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}

function Seccion({ id, paso, titulo, descripcion, children }: SeccionProps) {
  return (
    <Card aria-labelledby={id}>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Paso {paso} de 3
        </p>
        <h2 id={id} className="text-title text-primary">
          {titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ProfileSetupForm({ perfil, onCompleted }: ProfileSetupFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pasos que ya se guardaron, para no repetirlos si hay que reintentar tras un error en un paso posterior.
  const hechos = useRef<{ foto: File | null; datos: string | null }>({
    foto: null,
    datos: perfil.ci && perfil.telefono ? `${perfil.ci}|${perfil.telefono}` : null,
  });

  const fotoRequerida = !perfil.fotoUrl;

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfigurarPerfilValues>({
    resolver: zodResolver(configurarPerfilSchema),
    mode: 'onTouched',
    defaultValues: {
      ci: perfil.ci ?? '',
      telefono: perfil.telefono ?? '',
      passwordActual: '',
      passwordNueva: '',
      confirmar: '',
    },
  });

  const largoNueva = (watch('passwordNueva') ?? '').length;
  const MSG_FOTO_REQUERIDA = 'Sube tu fotografía actualizada.';

  const onInvalid = () => {
    if (fotoRequerida && !file) setFotoError(MSG_FOTO_REQUERIDA);
  };

  const onSubmit = async (values: ConfigurarPerfilValues) => {
    setSubmitError(null);
    if (fotoRequerida && !file) {
      setFotoError(MSG_FOTO_REQUERIDA);
      return;
    }

    try {
      // La contraseña va al final: es el único paso que no se puede repetir con los mismos datos.
      if (file && hechos.current.foto !== file) {
        await subirFotoPerfil(file);
        hechos.current.foto = file;
      }

      const claveDatos = `${values.ci}|${values.telefono}`;
      if (hechos.current.datos !== claveDatos) {
        await guardarDatosPerfil({ ci: values.ci, telefono: values.telefono });
        hechos.current.datos = claveDatos;
      }

      await cambiarPassword({
        passwordActual: values.passwordActual,
        passwordNueva: values.passwordNueva,
        confirmar: values.confirmar,
      });
    } catch (err) {
      if (err instanceof PerfilError && err.code === 'PASSWORD_ACTUAL_INCORRECTA') {
        setError('passwordActual', { type: 'server', message: mensajePerfilError(err) });
      } else if (err instanceof PerfilError && err.code === 'FOTO_INVALIDA') {
        setFotoError(mensajePerfilError(err));
      } else {
        const msg = mensajePerfilError(err);
        setSubmitError(msg);
        toast.error(msg);
      }
      return;
    }

    toast.success('Perfil configurado correctamente.');
    onCompleted();
  };

  const nueva = register('passwordNueva', {
    onChange: () => {
      if (getValues('confirmar')) void trigger('confirmar');
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="mx-auto flex max-w-3xl flex-col gap-4">
      <Seccion
        id="perfil-foto"
        paso={1}
        titulo="Fotografía actualizada"
        descripcion="Se usa para verificar tu identidad cuando presentas tu código QR."
      >
        <ProfilePhotoPicker
          fotoActualUrl={perfil.fotoUrl}
          file={file}
          onFileChange={(f) => {
            setFile(f);
            setFotoError(null);
          }}
          error={fotoError}
          disabled={isSubmitting}
        />
      </Seccion>

      <Seccion
        id="perfil-datos"
        paso={2}
        titulo="Datos personales"
        descripcion="Tu carnet de identidad y un celular de contacto."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileTextField
            id="perfil-ci"
            label="Carnet de identidad"
            registration={register('ci')}
            maxLength={10}
            placeholder="Ej. 8123456"
            error={errors.ci?.message}
            disabled={isSubmitting}
          />
          <ProfileTextField
            id="perfil-telefono"
            label="Teléfono celular"
            type="tel"
            registration={register('telefono')}
            autoComplete="tel-national"
            maxLength={8}
            placeholder="Ej. 71234567"
            error={errors.telefono?.message}
            disabled={isSubmitting}
          />
        </div>
      </Seccion>

      <Seccion
        id="perfil-password"
        paso={3}
        titulo="Nueva contraseña"
        descripcion="Reemplaza la contraseña inicial por una que solo tú conozcas."
      >
        <div className="flex flex-col gap-4">
          <PasswordField
            id="perfil-password-actual"
            label="Contraseña actual"
            autoComplete="current-password"
            registration={register('passwordActual')}
            error={errors.passwordActual?.message}
            disabled={isSubmitting}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              id="perfil-password-nueva"
              label="Nueva contraseña"
              autoComplete="new-password"
              registration={nueva}
              error={errors.passwordNueva?.message}
              counter={`${largoNueva}/${PASSWORD_MAX}`}
              hint={`De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres, con al menos una letra y un número`}
              maxLength={PASSWORD_MAX}
              disabled={isSubmitting}
            />
            <PasswordField
              id="perfil-password-confirmar"
              label="Confirmar nueva contraseña"
              autoComplete="new-password"
              registration={register('confirmar')}
              error={errors.confirmar?.message}
              maxLength={PASSWORD_MAX}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </Seccion>

      <div className="flex flex-col gap-3 pb-4">
        {submitError && <Alert>{submitError}</Alert>}

        <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Al guardar te llevaremos directo a tus exámenes.
        </p>
      </div>
    </form>
  );
}