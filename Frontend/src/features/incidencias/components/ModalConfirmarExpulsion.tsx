import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { ValoresFormularioExpulsion } from "../types/incidencias.types";
import { InsigniaMotivoExpulsion } from "./InsigniaMotivoExpulsion";

interface ModalConfirmarExpulsionProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  examenNombre: string;
  // Nombre de quien registra; si no se conoce, se usa un texto genérico.
  registradoPor?: string;
  // null mientras no hay datos pendientes de confirmar.
  valores: ValoresFormularioExpulsion | null;
  enviando: boolean;
  // Error devuelto por el POST (se muestra dentro del modal).
  error: string | null;
  onConfirmar: () => void;
}

export function ModalConfirmarExpulsion({
  abierto,
  onAbiertoChange,
  examenNombre,
  registradoPor,
  valores,
  enviando,
  error,
  onConfirmar,
}: ModalConfirmarExpulsionProps) {
  // Evita cerrar con Escape o clic afuera mientras se envía.
  function manejarCambio(nuevo: boolean) {
    if (enviando) return;
    onAbiertoChange(nuevo);
  }

  return (
    <Dialog open={abierto && valores !== null} onOpenChange={manejarCambio}>
      <DialogContent showCloseButton={false} className="md:max-w-lg">
        {valores && (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="text-3xl font-bold leading-tight text-primary">
                ¿Expulsar a {valores.estudiante.nombre} del examen?
              </DialogTitle>
              {/* El título ya describe la acción; se oculta la descripción visual. */}
              <DialogDescription className="sr-only">
                Confirmación de expulsión en {examenNombre}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">{examenNombre}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Código SIS:{" "}
                <span className="tabular-nums">
                  {valores.estudiante.codigoSis}
                </span>{" "}
                · {valores.estudiante.nombre}
              </p>
              <InsigniaMotivoExpulsion motivo={valores.motivo} className="mt-3" />
            </div>

            <p className="mt-2 text-body">
              {registradoPor
                ? `La expulsión quedará registrada por ${registradoPor}. `
                : "La expulsión quedará registrada a tu nombre. "}
              El estudiante no podrá reingresar a este examen.
            </p>

            <p className="text-sm text-muted-foreground">
              La expulsión aún no se ha registrado. Revisa los datos antes de
              continuar.
            </p>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-primary bg-card px-6 text-primary hover:bg-muted"
                disabled={enviando}
                onClick={() => onAbiertoChange(false)}
              >
                Volver
              </Button>
              <Button
                type="button"
                className="h-11 px-6"
                disabled={enviando}
                onClick={onConfirmar}
              >
                {enviando ? "Expulsando..." : "Confirmar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}