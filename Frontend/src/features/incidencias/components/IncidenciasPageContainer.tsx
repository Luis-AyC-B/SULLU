"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { useExamenesIncidencias } from "../hooks/useExamenesIncidencias";
import { useIncidenciasExamen } from "../hooks/useIncidenciasExamen";
import { usePuedeRegistrarIncidencia } from "../hooks/usePuedeRegistrarIncidencia";
import type { Incidencia } from "../types/incidencias.types";
import { ControlIncidenciasView } from "./ControlIncidenciasView";
import { IncidenciasSkeleton } from "./IncidenciasEstados";
import {
  RegisterIncidenceModal,
  type ValoresInicialesIncidencia,
} from "./RegisterIncidenceModal";

// Precarga por URL: /incidencias?sis=202104321&examenId=1
// (la usa el flujo "Registrar incidencia" de un ingreso rechazado en HU11).
function leerPrecarga(params: {
  get: (nombre: string) => string | null;
}): ValoresInicialesIncidencia | null {
  const sis = params.get("sis");
  const examenId = params.get("examenId");

  const codigoSis = sis && /^\d{1,15}$/.test(sis) ? sis : undefined;
  if (!codigoSis && !examenId) return null;

  return { codigoSis, examenId: examenId ?? undefined };
}

function IncidenciasContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const examenes = useExamenesIncidencias();
  const puedeRegistrar = usePuedeRegistrarIncidencia();

  const [precarga, setPrecarga] = useState(() => leerPrecarga(searchParams));
  const [seleccion, setSeleccion] = useState<string | null>(
    precarga?.examenId ?? null
  );
  // Solo se abre sola si la URL trae un SIS válido.
  const [modalAbierto, setModalAbierto] = useState(() =>
    Boolean(precarga?.codigoSis)
  );

  // Si no hay selección válida se usa el primer examen de la lista.
  const examenId =
    seleccion && examenes.examenes.some((e) => e.id === seleccion)
      ? seleccion
      : (examenes.examenes[0]?.id ?? null);

  const lista = useIncidenciasExamen(examenId);

  const puedeAbrirModal =
    puedeRegistrar && !examenes.isLoading && examenes.examenes.length > 0;

  function handleModalOpenChange(abierto: boolean) {
    setModalAbierto(abierto);
    if (!abierto && precarga) {
      // Se limpia la URL para que un refresh no vuelva a abrir el formulario.
      setPrecarga(null);
      router.replace("/incidencias");
    }
  }

  function handleRegistrada(incidencia: Incidencia) {
    if (incidencia.examenId !== examenId) {
      // Se muestra el examen de la incidencia recién creada.
      setSeleccion(incidencia.examenId);
    } else {
      lista.recargar();
    }
  }

  return (
    <PageContainer
      title="Registro de incidencias"
      subtitle="Intentos de ingreso de estudiantes no habilitados"
      actionLabel={puedeAbrirModal ? "+ Registrar incidencia" : undefined}
      onAction={() => setModalAbierto(true)}
    >
      <ControlIncidenciasView
        examenes={examenes.examenes}
        examenesLoading={examenes.isLoading}
        examenesError={examenes.error}
        onReintentarExamenes={examenes.reintentar}
        examenId={examenId}
        onExamenChange={setSeleccion}
        incidencias={lista.incidencias}
        incidenciasLoading={lista.isLoading}
        incidenciasError={lista.error}
        onReintentarIncidencias={lista.recargar}
      />

      {puedeAbrirModal && (
        <RegisterIncidenceModal
          open={modalAbierto}
          onOpenChange={handleModalOpenChange}
          examenes={examenes.examenes}
          examenIdActual={examenId}
          valoresIniciales={precarga}
          onRegistrada={handleRegistrada}
        />
      )}
    </PageContainer>
  );
}

// useSearchParams requiere un Suspense para que `next build` no falle.
export function IncidenciasPageContainer() {
  return (
    <Suspense fallback={<IncidenciasSkeleton conSelector />}>
      <IncidenciasContenido />
    </Suspense>
  );
}