'use client';

import { useState } from 'react';
import { KeyRound, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { cambiarMiPassword } from '../api/student-exam.service';

interface StudentPasswordChangeModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function StudentPasswordChangeModal({
  open,
  onSuccess,
}: StudentPasswordChangeModalProps) {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!passwordActual || !passwordNueva || !confirmarPassword) {
      setErrorMsg('Todos los campos son obligatorios');
      return;
    }

    if (passwordNueva !== confirmarPassword) {
      setErrorMsg('Las nuevas contraseñas no coinciden');
      return;
    }

    if (passwordNueva.length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    const regexComplejidad =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
    if (!regexComplejidad.test(passwordNueva)) {
      setErrorMsg(
        'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un símbolo especial (!@#$...)',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await cambiarMiPassword({
        passwordActual,
        passwordNueva,
        confirmarPassword,
      });
      toast.success('Contraseña actualizada con éxito');
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Error al cambiar contraseña';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="max-w-md p-6">
        <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Cambio Obligatorio de Contraseña
        </DialogTitle>

        <div className="mt-2 text-xs text-muted-foreground flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            Por seguridad, debes cambiar tu contraseña inicial (tu número de CI) antes de acceder a tus exámenes y código QR.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {errorMsg && (
            <p className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              {errorMsg}
            </p>
          )}

          <div>
            <label className="text-xs font-medium text-foreground">
              Contraseña actual (tu CI)
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Ingresa tu CI actual"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Nueva contraseña
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9, !@#)"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Confirmar nueva contraseña
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="pl-9"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-3 h-11 w-full gap-2 font-semibold">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando contraseña...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Actualizar y Continuar
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

