"use client";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { EstudianteExamen } from "../types/estudiante.types";
interface InhabilitarDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    estudiante: EstudianteExamen | null;
    onConfirm: (estudianteId: number, motivo?: string) => Promise<void>;
    isSubmitting?: boolean;
}
export function InhabilitarDialog({
    open,
    onOpenChange,
    estudiante,
    onConfirm,
    isSubmitting = false,
}: InhabilitarDialogProps) {
    const [motivo, setMotivo] = useState<string>("");
    if (!estudiante) return null;
    const handleConfirm = async () => {
        await onConfirm(estudiante.estudiante_id, motivo.trim() || undefined);
        setMotivo("");
        onOpenChange(false);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Inhabilitar estudiante
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-600 pt-1">
                        ¿Estás seguro de que deseas inhabilitar a{" "}
                        <span className="font-semibold text-slate-900">
                            {estudiante.nombre} {estudiante.apellido}
                        </span>{" "}
                        (codSIS: {estudiante.cod_sis}) para este examen?
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <p className="text-xs text-slate-500 italic">
                        * Esta inhabilitación se aplica únicamente a la lista de este examen sin afectar la vinculación del estudiante en otros exámenes.
                    </p>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Motivo de inhabilitación (opcional)
                        </label>
                        <Input
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ej. Deuda administrativa, No inscrito en la asignatura"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
                <DialogFooter className="pt-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="bg-[#D92D20] hover:bg-[#B42318] text-white"
                    >
                        {isSubmitting ? "Inhabilitando..." : "Inhabilitar estudiante"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}