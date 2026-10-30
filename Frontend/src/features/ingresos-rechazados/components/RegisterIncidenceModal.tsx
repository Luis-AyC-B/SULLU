"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useRegistrarIncidencia } from "../hooks/useRegistrarIncidencia";
import {
  CREAR_INCIDENCIA_DEFAULTS,
  MOTIVO_OPCIONES,
  OBSERVACIONES_MAX,
  crearIncidenciaFormSchema,
  toCrearIncidenciaPayload,
  type CrearIncidenciaFormValues,
  type ExamenIncidencia,
  type Incidencia,
  type MotivoIncidencia,
} from "../types/incidencias.types";
import { ExamenSelect } from "./ExamenSelect";

export interface ValoresInicialesIncidencia {
  codigoSis?: string;
  examenId?: string;
}

interface RegisterIncidenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examenes: ExamenIncidencia[];
  // Examen que se está viendo en el listado: es el valor inicial del selector.
  examenIdActual: string | null;
  // Precarga (por ejemplo, desde un ingreso rechazado en HU11).
  valoresIniciales?: ValoresInicialesIncidencia | null;
  onRegistrada: (incidencia: Incidencia) => void;
}

export function RegisterIncidenceModal({
  open,
  onOpenChange,
  examenes,
  examenIdActual,
  valoresIniciales,
  onRegistrada,
}: RegisterIncidenceModalProps) {
  const { registrar, isSubmitting } = useRegistrarIncidencia();

  return (
    <Dialog
      open={open}
      onOpenChange={(siguiente) => {
        // No se puede cerrar mientras se está guardando.
        if (!siguiente && isSubmitting) return;
        onOpenChange(siguiente);
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-6 sm:max-w-[560px] sm:p-8"
      >
        <DialogTitle className="text-headline text-primary">
          Registrar incidencia
        </DialogTitle>
        {/* El formulario se monta de nuevo cada vez que se abre el modal, así
            parte siempre de valores limpios (o de la precarga). */}
        <RegisterIncidenceForm
          examenes={examenes}
          examenIdActual={examenIdActual}
          valoresIniciales={valoresIniciales}
          registrar={registrar}
          isSubmitting={isSubmitting}
          onRegistrada={onRegistrada}
          onCerrar={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface RegisterIncidenceFormProps {
  examenes: ExamenIncidencia[];
  examenIdActual: string | null;
  valoresIniciales?: ValoresInicialesIncidencia | null;
  registrar: ReturnType<typeof useRegistrarIncidencia>["registrar"];
  isSubmitting: boolean;
  onRegistrada: (incidencia: Incidencia) => void;
  onCerrar: () => void;
}

const TEXTAREA_CLASES =
  "min-h-24 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

function RegisterIncidenceForm({
  examenes,
  examenIdActual,
  valoresIniciales,
  registrar,
  isSubmitting,
  onRegistrada,
  onCerrar,
}: RegisterIncidenceFormProps) {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const examenPrecargado = valoresIniciales?.examenId;
  const examenInicial =
    examenPrecargado && examenes.some((e) => e.id === examenPrecargado)
      ? examenPrecargado
      : (examenIdActual ?? "");

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<CrearIncidenciaFormValues>({
    resolver: zodResolver(crearIncidenciaFormSchema),
    defaultValues: {
      ...CREAR_INCIDENCIA_DEFAULTS,
      codigoSis: valoresIniciales?.codigoSis ?? "",
      examenId: examenInicial,
    },
  });

  const observaciones = watch("observaciones");

  async function onSubmit(values: CrearIncidenciaFormValues) {
    setErrorGeneral(null);

    // Solo viajan SIS, examen, motivo y observaciones: la hora y el usuario
    // los asigna el servidor.
    const resultado = await registrar(toCrearIncidenciaPayload(values));

    if (resultado.ok) {
      toast.success("Incidencia registrada");
      onRegistrada(resultado.incidencia);
      onCerrar();
      return;
    }

    const { code, message } = resultado.error;
    if (code === "SIS_NO_EXISTE") {
      setError("codigoSis", { type: "server", message }, { shouldFocus: true });
    } else if (code === "EXAMEN_INVALIDO") {
      setError("examenId", { type: "server", message });
    } else {
      // Sin conexión u otro fallo: los datos quedan en el formulario para reintentar.
      setErrorGeneral(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-6 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="incidencia-sis" className="text-label">
          Código SIS
        </label>
        <Input
          id="incidencia-sis"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej. 202104321"
          disabled={isSubmitting}
          aria-invalid={!!errors.codigoSis}
          className="h-11 bg-card"
          {...register("codigoSis")}
        />
        {errors.codigoSis && (
          <p role="alert" className="text-label text-destructive">
            {errors.codigoSis.message}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="examenId"
        render={({ field }) => (
          <ExamenSelect
            id="incidencia-examen"
            examenes={examenes}
            value={field.value}
            onChange={field.onChange}
            disabled={isSubmitting}
            error={errors.examenId?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="motivo"
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            <label htmlFor="incidencia-motivo" className="text-label">
              Motivo
            </label>
            <Select
              value={field.value}
              onValueChange={(valor) => field.onChange(valor as MotivoIncidencia)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="incidencia-motivo"
                aria-invalid={!!errors.motivo}
                className="w-full bg-card data-[size=default]:h-11"
              >
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVO_OPCIONES.map((opcion) => (
                  <SelectItem key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.motivo && (
              <p role="alert" className="text-label text-destructive">
                {errors.motivo.message}
              </p>
            )}
          </div>
        )}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="incidencia-observaciones" className="text-label">
          Observaciones
        </label>
        <textarea
          id="incidencia-observaciones"
          placeholder="Describe lo ocurrido (opcional)"
          maxLength={OBSERVACIONES_MAX}
          disabled={isSubmitting}
          aria-invalid={!!errors.observaciones}
          className={TEXTAREA_CLASES}
          {...register("observaciones")}
        />
        <div className="flex items-start justify-between gap-3">
          <p role="alert" className="text-label text-destructive">
            {errors.observaciones?.message}
          </p>
          <p className="shrink-0 text-label text-muted-foreground">
            {observaciones.length}/{OBSERVACIONES_MAX}
          </p>
        </div>
      </div>

      {errorGeneral && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorGeneral}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCerrar}
          className="h-11 w-full border-primary text-primary sm:w-auto sm:min-w-28"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full sm:w-auto sm:min-w-28"
        >
          {isSubmitting
            ? "Registrando…"
            : errorGeneral
              ? "Reintentar"
              : "Registrar"}
        </Button>
      </div>
    </form>
  );
}