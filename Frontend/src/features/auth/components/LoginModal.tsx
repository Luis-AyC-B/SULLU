'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { LoginForm } from './LoginForm';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de Iniciar Sesión (HU 5)
 * Se renderiza sobre la página de bienvenida con desenfoque de fondo (backdrop-blur).
 * Cumple con el mockup de media_1789852730507.png.
 */
export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent 
        className="max-w-[430px] w-[calc(100%-2rem)] p-0 bg-transparent border-0 shadow-none ring-0 focus:outline-none"
        showCloseButton={false}
        overlayClassName="bg-black/50 backdrop-blur-sm transition-all duration-300"
      >
        <DialogTitle className="sr-only">Iniciar sesión en ExaControl</DialogTitle>
        <LoginForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
