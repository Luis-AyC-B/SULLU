"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useDebouncedValue } from "@/features/registro-ingresos/hooks/useDebouncedValue";
import { useExamenesExpulsion } from "../hooks/useExamenesExpulsion";
import { useIncidenciasPorExamen } from "../hooks/useIncidenciasPorExamen";
import { usePuedeRegistrarExpulsion } from "../hooks/usePuedeRegistrarExpulsion";
import { filtrarIncidencias } from "../lib/filtrarIncidencias";
import {
  ETIQUETA_MOTIVO_EXPULSION,
  etiquetaContadorIncidencias,
  formatearHoraIncidencia,
} from "../types/incidencias.types";

function EsqueletoCarga() {
  return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
}

function AvisoError({
  mensaje,
  alReintentar,
}: {
  mensaje: string;
  alReintentar: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <span>{mensaje}</span>
      <Button type="button" variant="outline" onClick={alReintentar}>
        Reintentar
      </Button>
    </div>
  );
}

export function VistaIncidencias() {
  const {
    examenes,
    cargando: cargandoExamenes,
    error: errorExamenes,
    reintentar: reintentarExamenes,
  } = useExamenesExpulsion();
  const puedeRegistrar = usePuedeRegistrarExpulsion();

  const [seleccion, setSeleccion] = useState<string | null>(null);
  // Si el usuario aún no eligió, se usa el primer examen de la lista.
  const examenId =
    seleccion && examenes.some((e) => e.id === seleccion)
      ? seleccion
      : (examenes[0]?.id ?? null);
  const examen = examenes.find((e) => e.id === examenId) ?? null;

  const { incidencias, cargando, error, recargar } =
    useIncidenciasPorExamen(examenId);

  const [busqueda, setBusqueda] = useState("");
  const busquedaDiferida = useDebouncedValue(busqueda, 300);
  const incidenciasFiltradas = useMemo(
    () => filtrarIncidencias(incidencias ?? [], busquedaDiferida),
    [incidencias, busquedaDiferida],
  );

  const total = incidencias?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-headline text-primary">Incidencias</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Incidencias en pleno examen: estudiantes expulsados
          </p>
        </div>

        {puedeRegistrar && (
          <Button
            type="button"
            // TODO Tarea 6: abrir ModalRegistrarExpulsion
            disabled={!examen || !examen.enCurso}
            title={
              examen && !examen.enCurso
                ? "Solo se puede expulsar en un examen en curso"
                : undefined
            }
            className="h-11 w-full gap-2 px-5 text-base sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Registrar expulsión
          </Button>
        )}
      </div>

      {errorExamenes && (
        <AvisoError mensaje={errorExamenes} alReintentar={reintentarExamenes} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="incidencias-examen" className="text-sm font-medium">
            Examen
          </label>
          <Select
            value={examenId ?? ""}
            onValueChange={setSeleccion}
            disabled={cargandoExamenes || examenes.length === 0}
          >
            <SelectTrigger
              id="incidencias-examen"
              className="w-full bg-card data-[size=default]:h-11"
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="incidencias-buscar" className="text-sm font-medium">
            Buscar estudiante
          </label>
          <div className="relative">
            <Input
              id="incidencias-buscar"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código SIS"
              autoComplete="off"
              className="h-11 bg-card pr-10 text-base [&::-webkit-search-cancel-button]:hidden"
            />
            <Search
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {examen?.ubicacion && (
        <p className="-mt-3 text-xs text-muted-foreground">{examen.ubicacion}</p>
      )}

      {(cargandoExamenes || cargando) && <EsqueletoCarga />}

      {!cargando && error && incidencias === null && (
        <AvisoError mensaje={error} alReintentar={recargar} />
      )}

      {/* TEMPORAL: las Tareas 4 y 5 reemplazan este bloque por la tabla,
          el estado vacío y la lista móvil. */}
      {!cargando && incidencias !== null && incidenciasFiltradas.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-6 py-12 text-center text-body text-muted-foreground">
          {busquedaDiferida.trim() !== "" && total > 0
            ? "No se encontraron incidencias para tu búsqueda."
            : "Aún no hay incidencias en este examen"}
        </p>
      )}

      {!cargando && incidencias !== null && incidenciasFiltradas.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {incidenciasFiltradas.map((i) => (
              <li
                key={i.id}
                className="rounded-lg border border-border bg-card p-3 text-sm"
              >
                {formatearHoraIncidencia(i.fechaHora)} · {i.codigoSis} ·{" "}
                {i.estudianteNombre} · {ETIQUETA_MOTIVO_EXPULSION[i.motivo]} ·{" "}
                {i.detalle} · {i.registradoPor}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            {etiquetaContadorIncidencias(total)}
          </p>
        </div>
      )}
    </div>
  );
}