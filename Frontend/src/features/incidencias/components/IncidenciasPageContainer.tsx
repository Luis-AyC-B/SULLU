// src/features/incidencias/components/IncidenciasPageContainer.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/button";
import { useExamenesIncidencias } from "../hooks/useExamenesIncidencias";
import { useIncidenciasExamen } from "../hooks/useIncidenciasExamen";
import { usePuedeRegistrarIncidencia } from "../hooks/usePuedeRegistrarIncidencia";
import { offlineIncidenciasService } from "../services/offline-incidencias.service";
import type { Incidencia } from "../types/incidencias.types";
import { filtrarIncidenciasPorMotivo } from "../types/incidencias.types";
import { ControlIncidenciasView } from "./ControlIncidenciasView";
import { IncidenciasSkeleton } from "./IncidenciasEstados";
import {
  RegisterIncidenceModal,
  type ValoresInicialesIncidencia,
} from "./RegisterIncidenceModal";
import { ConfirmarDescargaObservacionesModal } from "./ConfirmarDescargaObservacionesModal";
import { descargarReporteObservacionesPdf } from "../api/incidencias.service";
import { obtenerNombreMateriaIncidencia } from "../lib/generarPdfReporteObservaciones";

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
  const { data: session } = useSession();

  // HU-18: Identificación de rol (Docente vs Personal de Control)
  const userRole = (session?.user?.rol || "").toLowerCase();
  const userEmail = (session?.user?.email || "").toLowerCase();
  const isDocente =
    userRole.includes("docente") ||
    userEmail.includes("docente") ||
    Boolean(session?.user?.permisos?.some((p: string) => p.includes("docente")));

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

  // HU-18: Estado del filtro por motivo
  const [motivoFiltro, setMotivoFiltro] = useState<string>("TODOS");

  // HU-18: Estado de descarga del PDF de observaciones
  const [isModalDescargaOpen, setIsModalDescargaOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Si no hay selección válida se usa el primer examen de la lista.
  const examenId =
    seleccion && examenes.examenes.some((e) => e.id === seleccion)
      ? seleccion
      : (examenes.examenes[0]?.id ?? null);

  const lista = useIncidenciasExamen(examenId);

  const examenSeleccionado = useMemo(
    () => examenes.examenes.find((e) => e.id === examenId) || null,
    [examenes.examenes, examenId]
  );

  const materiaNombre = useMemo(() => {
    return examenSeleccionado
      ? obtenerNombreMateriaIncidencia(examenSeleccionado.nombre)
      : "la materia";
  }, [examenSeleccionado]);

  const incidenciasFiltradas = useMemo(() => {
    return filtrarIncidenciasPorMotivo(lista.incidencias ?? [], motivoFiltro);
  }, [lista.incidencias, motivoFiltro]);

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

  // Solo el Personal de Control (o quien no sea Docente pero tenga permisos) ve el botón de registrar
  const puedeAbrirModal =
    !isDocente && puedeRegistrar && !examenes.isLoading && examenes.examenes.length > 0;

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

  // HU-18: Clic en "Descargar PDF" para el Docente
  const handleSolicitarDescarga = () => {
    if (!examenId || !examenSeleccionado) {
      toast.error("Selecciona una materia para descargar el reporte");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Necesitas conexión para descargar el reporte");
      return;
    }

    if (incidenciasFiltradas.length === 0) {
      toast.warning("No hay observaciones registradas para descargar");
      return;
    }

    setErrorDescarga(null);
    setIsModalDescargaOpen(true);
  };

  // HU-18: Confirmar descarga desde el modal
  const handleConfirmarDescarga = async () => {
    if (!examenSeleccionado) return;
    if (isDownloading) return;

    setIsDownloading(true);
    setErrorDescarga(null);

    try {
      const docenteNombre = session?.user?.name || "Docente titular";
      const { blob, filename } = await descargarReporteObservacionesPdf(
        examenSeleccionado,
        incidenciasFiltradas,
        motivoFiltro,
        docenteNombre
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reporte descargado");
      setIsModalDescargaOpen(false);
    } catch (err) {
      console.error("Error al descargar reporte de observaciones:", err);
      setErrorDescarga(
        "Ocurrió un error al generar el reporte de observaciones. Por favor, reintenta la operación."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PageContainer
      title="Registro de incidencias"
      subtitle="Observaciones de ingreso por examen"
      actionLabel={puedeAbrirModal ? "+ Registrar incidencia" : undefined}
      onAction={() => setModalAbierto(true)}
      headerExtra={
        isDocente ? (
          <Button
            type="button"
            onClick={handleSolicitarDescarga}
            disabled={!examenId || isDownloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#003770] px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-[#002850] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            aria-label="Descargar PDF"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 shrink-0" />
                <span>Descargar PDF</span>
              </>
            )}
          </Button>
        ) : undefined
      }
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

      {/* Vista con filtros combinables de Materia y Motivo */}
      <ControlIncidenciasView
        examenes={examenes.examenes}
        examenesLoading={examenes.isLoading}
        examenesError={examenes.error}
        onReintentarExamenes={examenes.reintentar}
        examenId={examenId}
        onExamenChange={setSeleccion}
        motivoSeleccionado={motivoFiltro}
        onMotivoChange={setMotivoFiltro}
        incidencias={lista.incidencias}
        incidenciasLoading={lista.isLoading}
        incidenciasError={lista.error}
        onReintentarIncidencias={lista.recargar}
      />

      {/* Modal para Personal de Control */}
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

      {/* HU-18: Modal de confirmación de descarga para Docente */}
      <ConfirmarDescargaObservacionesModal
        isOpen={isModalDescargaOpen}
        onClose={() => setIsModalDescargaOpen(false)}
        onConfirm={handleConfirmarDescarga}
        materiaNombre={materiaNombre}
        isDownloading={isDownloading}
        errorDescarga={errorDescarga}
        onRetry={handleConfirmarDescarga}
      />
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
