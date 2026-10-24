"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { useExamenesIncidencias } from "../hooks/useExamenesIncidencias";
import { useIncidenciasExamen } from "../hooks/useIncidenciasExamen";
import { usePuedeRegistrarIncidencia } from "../hooks/usePuedeRegistrarIncidencia";
import { offlineIncidenciasService } from "../services/offline-incidencias.service";
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

  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Si no hay selección válida se usa el primer examen de la lista.
  const examenId =
    seleccion && examenes.examenes.some((e) => e.id === seleccion)
      ? seleccion
      : (examenes.examenes[0]?.id ?? null);

  const lista = useIncidenciasExamen(examenId);

  useEffect(() => {
    const updateCount = () => {
      setPendientesOffline(
        offlineIncidenciasService.contarPendientesSync(examenId ?? undefined)
      );
    };
    updateCount();
    window.addEventListener("sullu_incidencias_offline_updated", updateCount);
    window.addEventListener("online", updateCount);
    return () => {
      window.removeEventListener(
        "sullu_incidencias_offline_updated",
        updateCount
      );
      window.removeEventListener("online", updateCount);
    };
  }, [examenId]);

  const handleSincronizar = async () => {
    setIsSyncing(true);
    try {
      const res = await offlineIncidenciasService.sincronizarLote();
      toast.success(
        `Sincronización completada: ${res.totalSincronizados} procesadas, ${res.totalOmitidos} omitidas.`
      );
      lista.recargar();
    } catch {
      toast.error("Error al sincronizar incidencias. Verifica la conexión.");
    } finally {
      setIsSyncing(false);
    }
  };

  const puedeAbrirModal =
    puedeRegistrar && !examenes.isLoading && examenes.examenes.length > 0;

  function handleModalOpenChange(abierto: boolean) {
    setModalAbierto(abierto);
    if (!abierto && precarga) {
      setPrecarga(null);
      router.replace("/incidencias");
    }
  }

  function handleRegistrada(incidencia: Incidencia) {
    if (incidencia.examenId !== examenId) {
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
      {pendientesOffline > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              Tienes <strong>{pendientesOffline}</strong> incidencia
              {pendientesOffline > 1 ? "s" : ""} registrada
              {pendientesOffline > 1 ? "s" : ""} en modo offline pendiente
              {pendientesOffline > 1 ? "s" : ""} de sincronizar.
            </span>
          </div>
          <button
            onClick={handleSincronizar}
            disabled={isSyncing}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
          </button>
        </div>
      )}

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
