// src/features/registro-ingresos/components/ControlIngresosPageContainer.tsx
"use client";

import { useMemo, useState } from "react";
import { WifiOff } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { ControlExamSelectorHeader } from "./ControlExamSelectorHeader";
import { EnVivoBadge } from "./EnVivoBadge";
import { IngresosTableToolbar } from "./IngresosTableToolbar";
import { IngresosTable } from "./IngresosTable";
import { useExamenesControl } from "../hooks/useExamenesControl";
import { useIngresosExamen } from "../hooks/useIngresosExamen";
import { filtrarIngresos } from "../lib/filtrarIngresos";

export function ControlIngresosPageContainer() {
  const { examenes, isLoading: cargandoExamenes, error: errorExamenes } =
    useExamenesControl();

  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  // Si el usuario aún no eligió, se usa el primer examen de la lista
  const examenId =
    seleccionado ?? (examenes[0] ? String(examenes[0].id) : null);

  const { data, conexion } = useIngresosExamen(examenId);
  const [busqueda, setBusqueda] = useState("");

  const ingresosFiltrados = useMemo(
    () => filtrarIngresos(data?.ingresos ?? [], busqueda),
    [data, busqueda],
  );

  const cargandoIngresos = cargandoExamenes || (examenId !== null && data === null);

  return (
    <PageContainer
      title="Lista de ingresos"
      subtitle="Lista en tiempo real por examen"
      headerExtra={
        <EnVivoBadge
          conexion={conexion}
          ingresados={data?.ingresados}
          total={data?.total}
        />
      }
    >
      <div className="flex flex-col gap-6">
        {errorExamenes && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No se pudo cargar la lista de exámenes. Recarga la página para intentarlo de nuevo.
          </div>
        )}

        {conexion === "desconectado" && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <WifiOff className="h-4 w-4 shrink-0" />
            Se perdió la conexión en vivo. Reintentando; los datos mostrados pueden estar desactualizados.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ControlExamSelectorHeader
            examenes={examenes}
            examenId={examenId}
            onExamenChange={setSeleccionado}
            conexion={conexion}
            isLoading={cargandoExamenes}
            showBadge={false}
          />
          <IngresosTableToolbar onSearchChange={setBusqueda} />
        </div>

        <IngresosTable
          ingresos={ingresosFiltrados}
          isLoading={cargandoIngresos}
          hayBusqueda={busqueda.trim() !== ""}
          ingresados={data?.ingresados ?? 0}
          total={data?.total ?? 0}
        />
      </div>
    </PageContainer>
  );
}
