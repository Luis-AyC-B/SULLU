'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Camera,
  Contact,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import {
  cambiarPassword,
  guardarDatosPerfil,
  PerfilError,
  subirFotoPerfil,
} from '../api/student-profile.service';
import { AVISO_ERROR, BTN_PRIMARIO } from '../lib/estilos-perfil';
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
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}

function Seccion({ id, paso, icon: Icon, titulo, descripcion, children }: SeccionProps) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center gap-3 border-b border-border bg-primary/5 px-6 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Paso {paso} de 3</p>
          <h2 id={id} className="text-base font-bold text-foreground">
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
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
        setSubmitError(mensajePerfilError(err));
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
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="mx-auto flex max-w-3xl flex-col gap-5">
      <Seccion
        id="perfil-foto"
        paso={1}
        icon={Camera}
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
        icon={UserRound}
        titulo="Datos personales"
        descripcion="Tu carnet de identidad y un celular de contacto."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileTextField
            id="perfil-ci"
            label="Carnet de identidad"
            icon={Contact}
            registration={register('ci')}
            maxLength={10}
            placeholder="Ej. 8123456"
            error={errors.ci?.message}
            disabled={isSubmitting}
          />
          <ProfileTextField
            id="perfil-telefono"
            label="Teléfono celular"
            icon={Phone}
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
        icon={Lock}
        titulo="Nueva contraseña"
        descripcion="Reemplaza la contraseña inicial por una que solo tú conozcas."
      >
        <div className="flex flex-col gap-4">
          <PasswordField
            id="perfil-password-actual"
            label="Contraseña actual"
            icon={Lock}
            autoComplete="current-password"
            registration={register('passwordActual')}
            error={errors.passwordActual?.message}
            disabled={isSubmitting}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              id="perfil-password-nueva"
              label="Nueva contraseña"
              icon={KeyRound}
              autoComplete="new-password"
              registration={nueva}
              error={errors.passwordNueva?.message}
              hint={`De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres, con al menos una letra y un número · ${largoNueva}/${PASSWORD_MAX}`}
              maxLength={PASSWORD_MAX}
              disabled={isSubmitting}
            />
            <PasswordField
              id="perfil-password-confirmar"
              label="Confirmar nueva contraseña"
              icon={ShieldCheck}
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
        {submitError && (
          <p role="alert" className={AVISO_ERROR}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className={`h-12 w-full text-base ${BTN_PRIMARIO}`}>
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-5 w-5" aria-hidden="true" />
          )}
          {isSubmitting ? 'Guardando…' : 'Guardar y continuar'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Al guardar te llevaremos directo a tus exámenes.
        </p>
      </div>
    </form>
  );
}