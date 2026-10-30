"use client";

import { useEffect, useId, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useGenerarReporte } from "../hooks/useGenerarReporte";
import type { FiltrosReporte } from "../lib/filtrarReporte";
import {
  OPCIONES_MOTIVO_EXPULSION,
  type ExamenExpulsion,
} from "../types/incidencias.types";

interface Props {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  examenes: ExamenExpulsion[];
  examenInicialId: string | null;
  generadoPor?: string;
}

function filtrosIniciales(examenId: string | null): FiltrosReporte {
  return { examenId: examenId ?? "", motivo: "TODOS", estudiante: "" };
}

export function ModalGenerarReporte({
  abierto,
  onAbiertoChange,
  examenes,
  examenInicialId,
  generadoPor,
}: Props) {
  const idBase = useId();
  const idExamen = `${idBase}-examen`;
  const idMotivo = `${idBase}-motivo`;
  const idEstudiante = `${idBase}-estudiante`;

  const [filtros, setFiltros] = useState<FiltrosReporte>(() =>
    filtrosIniciales(examenInicialId),
  );
  const { generar, generando, error, limpiarError } = useGenerarReporte();

  const examen = examenes.find((e) => e.id === filtros.examenId) ?? null;

  // Al abrir, parte del examen actual y sin filtros.
  useEffect(() => {
    if (!abierto) return;
    setFiltros(filtrosIniciales(examenInicialId));
    limpiarError();
  }, [abierto, examenInicialId, limpiarError]);

  function actualizar<K extends keyof FiltrosReporte>(
    k: K,
    v: FiltrosReporte[K],
  ) {
    limpiarError();
    setFiltros((f) => ({ ...f, [k]: v }));
  }

  function cambiarAbierto(valor: boolean) {
    if (generando) return;
    onAbiertoChange(valor);
  }

  async function alGenerar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!examen || generando) return;
    const ok = await generar(examen, filtros, generadoPor);
    if (ok) onAbiertoChange(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-y-auto max-md:left-0 max-md:top-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none md:max-h-[90dvh] md:max-w-xl"
      >
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 mb-2 self-start text-primary md:hidden"
          onClick={() => cambiarAbierto(false)}
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Incidencias
        </Button>

        <DialogHeader className="mb-6 text-left">
          <DialogTitle className="text-3xl font-bold text-primary">
            Generar reporte
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Filtra las incidencias que quieres incluir en el PDF.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={alGenerar} noValidate className="flex flex-col gap-5">
          {/* Examen */}
          <div>
            <Label htmlFor={idExamen}>Examen</Label>
            <Select
              value={filtros.examenId}
              onValueChange={(v) => actualizar("examenId", v)}
            >
              <SelectTrigger
                id={idExamen}
                className="mt-2 w-full bg-card data-[size=default]:h-11"
              >
                <SelectValue placeholder="Selecciona un examen" />
              </SelectTrigger>
              <SelectContent>
                {examenes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor={idMotivo}>Motivo</Label>
            <Select
              value={filtros.motivo}
              onValueChange={(v) =>
                actualizar("motivo", v as FiltrosReporte["motivo"])
              }
            >
              <SelectTrigger
                id={idMotivo}
                className="mt-2 w-full bg-card data-[size=default]:h-11"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los motivos</SelectItem>
                {OPCIONES_MOTIVO_EXPULSION.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estudiante */}
          <div>
            <Label htmlFor={idEstudiante}>Estudiante</Label>
            <Input
              id={idEstudiante}
              value={filtros.estudiante}
              onChange={(e) => actualizar("estudiante", e.target.value)}
              placeholder="Nombre o código SIS (opcional)"
              autoComplete="off"
              className="mt-2 h-11 bg-card"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-primary bg-card px-6 text-primary hover:bg-muted"
              onClick={() => cambiarAbierto(false)}
              disabled={generando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 px-6"
              disabled={!examen || generando}
            >
              {generando ? "Generando..." : "Generar PDF"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}