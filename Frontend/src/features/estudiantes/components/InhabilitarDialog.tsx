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
  onConfirm: (estudianteId: number, motivo: string) => Promise<void>;
  isSubmitting?: boolean;
}

const MOTIVOS_SUGERIDOS = [
  "No inscrito en la asignatura",
  "Deuda administrativa",
  "Falta de requisitos",
  "Inasistencia recurrente",
];

export function InhabilitarDialog({
  open,
  onOpenChange,
  estudiante,
  onConfirm,
  isSubmitting = false,
}: InhabilitarDialogProps) {
  const [motivo, setMotivo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!estudiante) return null;

  const handleConfirm = async () => {
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setError("El motivo de inhabilitación es obligatorio.");
      return;
    }

    setError(null);
    await onConfirm(estudiante.estudiante_id, motivoLimpio);
    setMotivo("");
    onOpenChange(false);
  };

  const handleSelectSugerido = (sug: string) => {
    setMotivo(sug);
    setError(null);
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

        <div className="space-y-3.5 py-2">
          <p className="text-xs text-slate-500 italic">
            * Esta inhabilitación se aplica únicamente a este examen, sin alterar el estado del estudiante en otros exámenes.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Motivo de inhabilitación <span className="text-rose-600">*</span>
            </label>
            <Input
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (e.target.value.trim()) setError(null);
              }}
              placeholder="Escribe el motivo obligatorio..."
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-xs font-medium text-rose-600">{error}</p>
            )}
          </div>

          {/* Sugerencias rápidas */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">
              Sugerencias rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS_SUGERIDOS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSelectSugerido(sug)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    motivo === sug
                      ? "border-[#002D62] bg-[#F0F5FA] text-[#002D62] font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
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
            disabled={isSubmitting || !motivo.trim()}
            className="bg-[#D92D20] hover:bg-[#B42318] text-white"
          >
            {isSubmitting ? "Inhabilitando..." : "Inhabilitar estudiante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}