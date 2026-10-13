'use client';

import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { StudentLoginView } from './StudentLoginView';

interface StudentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StudentLoginModal({ isOpen, onClose }: StudentLoginModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[430px] border-0 bg-transparent p-0 shadow-none ring-0 focus:outline-none"
        showCloseButton={false}
        overlayClassName="bg-black/50 backdrop-blur-sm transition-all duration-300"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Ingreso de estudiantes a ExaControl</DialogTitle>
        <StudentLoginView onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}