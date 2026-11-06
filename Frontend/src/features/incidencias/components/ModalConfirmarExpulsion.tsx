import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  ETIQUETA_CASO_INCIDENCIA,
  type ValoresFormularioExpulsion,
} from "../types/incidencias.types";
import { InsigniaCasoIncidencia } from "./InsigniaCasoIncidencia";
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

  const esExpulsion = valores?.caso === "EXPULSION";
  const esSuplantacion = valores?.caso === "SUPLANTACION_IDENTIDAD";

  return (
    <Dialog open={abierto && valores !== null} onOpenChange={manejarCambio}>
      <DialogContent showCloseButton={false} className="md:max-w-lg">
        {valores && (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="text-3xl font-bold leading-tight text-primary">
                {esExpulsion
                  ? `¿Expulsar a ${valores.estudiante.nombre} del examen?`
                  : esSuplantacion
                    ? `¿Registrar suplantación de identidad para ${valores.estudiante.nombre}?`
                    : `¿Registrar ${ETIQUETA_CASO_INCIDENCIA[valores.caso].toLowerCase()} para ${valores.estudiante.nombre}?`}
              </DialogTitle>
              {/* El título ya describe la acción; se oculta la descripción visual. */}
              <DialogDescription className="sr-only">
                Confirmación de incidencia en {examenNombre}
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InsigniaCasoIncidencia caso={valores.caso} />
                <InsigniaMotivoExpulsion motivo={valores.motivo} />
              </div>
              {valores.detalle?.trim() ? (
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap break-words border-t border-border/60 pt-2">
                  <span className="font-medium text-foreground">Detalle:</span>{" "}
                  {valores.detalle}
                </p>
              ) : (
                <p className="mt-2 text-xs italic text-muted-foreground border-t border-border/60 pt-2">
                  Sin observaciones en el detalle.
                </p>
              )}
            </div>

            <p className="mt-2 text-body">
              {registradoPor
                ? `La incidencia quedará registrada por ${registradoPor}. `
                : "La incidencia quedará registrada a tu nombre. "}
              {esExpulsion
                ? "El estudiante no podrá reingresar a este examen."
                : esSuplantacion
                  ? "El estudiante quedará inhabilitado de inmediato y se iniciará el informe disciplinario."
                  : "La incidencia quedará asentada en el reporte del examen."}
            </p>

            <p className="text-sm text-muted-foreground">
              La incidencia aún no se ha guardado. Revisa los datos antes de
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
                {enviando
                  ? "Registrando..."
                  : esExpulsion
                    ? "Confirmar expulsión"
                    : esSuplantacion
                      ? "Confirmar suplantación"
                      : "Confirmar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
