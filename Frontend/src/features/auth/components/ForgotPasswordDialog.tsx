'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { KeyRound, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { recoverySchema, RecoveryFormValues } from '../schemas/login.schema';
import { requestPasswordRecovery } from '../api/auth-api';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordDialog({
  isOpen,
  onClose,
  defaultEmail = '',
}: ForgotPasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: defaultEmail },
  });

  const onSubmit = async (values: RecoveryFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await requestPasswordRecovery(values.email);
      setFeedbackMessage(result.message);
      setIsSuccess(true);
    } catch {
      setFeedbackMessage(
        'Si el correo está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.'
      );
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setFeedbackMessage('');
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="flex flex-col items-center text-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : (
              <KeyRound className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isSuccess ? 'Solicitud procesada' : 'Recuperar contraseña'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isSuccess
              ? 'Revisa la bandeja de entrada de tu correo institucional.'
              : 'Ingresa tu correo institucional registrado para recibir las instrucciones de restablecimiento.'}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-5 py-2">
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">
              <p className="leading-relaxed">{feedbackMessage}</p>
            </div>
            <Button
              type="button"
              variant="default"
              onClick={handleClose}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label
                htmlFor="recovery-email"
                className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Correo institucional
              </label>
              <Input
                id="recovery-email"
                type="email"
                placeholder="usuario@universidad.edu"
                className="h-11 rounded-lg border-input bg-white px-3 text-sm focus-visible:ring-primary"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs font-medium text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:w-1/2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar instrucciones'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
