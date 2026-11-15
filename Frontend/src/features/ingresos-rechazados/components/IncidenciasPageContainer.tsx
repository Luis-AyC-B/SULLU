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
import type {
  FiltrosIncidencias,
  Incidencia,
  RolIncidencias,
} from "../types/incidencias.types";
import {
  filtrarIncidenciasPorMotivo,
  obtenerGestionVigente,
} from "../types/incidencias.types";
import { ControlIncidenciasView } from "./ControlIncidenciasView";
import { IncidenciasSkeleton } from "./IncidenciasEstados";
import {
  RegisterIncidenceModal,
  type ValoresInicialesIncidencia,
} from "./RegisterIncidenceModal";
import { ConfirmarDescargaObservacionesModal } from "./ConfirmarDescargaObservacionesModal";
import {
  descargarReporteObservacionesPdf,
} from "../api/incidencias.service";
import { obtenerNombreMateriaIncidencia } from "../lib/generarPdfReporteObservaciones";

// Precarga por URL: /ingresos-rechazados?sis=202104321&examenId=1
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

  // Determinación segura y robusta del rol
  const rol: RolIncidencias = useMemo(() => {
    const rawRole = (session?.user?.rol || "").toLowerCase();
    const rawEmail = (session?.user?.email || "").toLowerCase();
    const permisos = session?.user?.permisos || [];

    if (
      rawRole.includes("admin") ||
      rawEmail.includes("admin") ||
      permisos.some((p: string) => p.includes("admin"))
    ) {
      return "admin";
    }

    if (
      rawRole.includes("docente") ||
      rawEmail.includes("docente") ||
      permisos.some((p: string) => p.includes("docente"))
    ) {
      return "docente";
    }

    if (
      rawRole.includes("control") ||
      rawEmail.includes("control") ||
      permisos.some((p: string) => p.includes("control"))
    ) {
      return "control";
    }

    return "custom";
  }, [session]);

  const examenesHook = useExamenesIncidencias();
  const puedeRegistrar = usePuedeRegistrarIncidencia();

  const [precarga, setPrecarga] = useState(() => leerPrecarga(searchParams));
  const [modalAbierto, setModalAbierto] = useState(() =>
    Boolean(precarga?.codigoSis)
  );

  // Inicializar examen con precarga o primer examen si existe
  const examenInicial = precarga?.examenId ?? examenesHook.examenes[0]?.id ?? "TODOS";

  // Filtros combinables de HU-18
  const [filtros, setFiltros] = useState<FiltrosIncidencias>({
    facultadId: "TODAS",
    carreraId: "TODAS",
    docenteId: "TODOS",
    gestion: obtenerGestionVigente(),
    materiaId: "TODAS",
    examenId: examenInicial,
    motivo: "TODOS",
  });

  // Si se cargan exámenes y examenId sigue en TODOS o vacío, sincronizar si es conveniente
  useEffect(() => {
    if (filtros.examenId === "TODOS" && examenesHook.examenes.length > 0 && !precarga) {
      // mantenemos examenId según preferencia del usuario o lista disponible
    }
  }, [examenesHook.examenes, filtros.examenId, precarga]);

  // Estado de descarga del PDF de observaciones
  const [isModalDescargaOpen, setIsModalDescargaOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtrado de exámenes según filtros seleccionados
  const examenesFiltrados = useMemo(() => {
    return examenesHook.examenes.filter((e) => {
      if (filtros.facultadId !== "TODAS" && e.facultadId && e.facultadId !== filtros.facultadId) {
        return false;
      }
      if (filtros.carreraId !== "TODAS" && e.carreraId && e.carreraId !== filtros.carreraId) {
        return false;
      }
      if (filtros.docenteId !== "TODOS" && e.docenteId && e.docenteId !== filtros.docenteId) {
        return false;
      }
      if (filtros.gestion && e.gestion && e.gestion !== filtros.gestion) {
        return false;
      }
      if (filtros.materiaId !== "TODAS" && (e.materiaId ?? e.materia ?? e.nombre) !== filtros.materiaId) {
        return false;
      }
      return true;
    });
  }, [examenesHook.examenes, filtros]);

  // Manejo de carga de observaciones de ingreso:
  // Hook conectado directamente a la API GET /observaciones-ingreso con alcance por rol
  const examenIdParaHook = filtros.examenId !== "TODOS" ? filtros.examenId : null;
  const listaHook = useIncidenciasExamen(examenIdParaHook, filtros);

  // Incidencias base a mostrar
  const incidenciasBase = useMemo(() => {
    return listaHook.incidencias ?? [];
  }, [listaHook.incidencias]);

  // Filtrado final por motivo (garantiza sincronía si los datos locales no lo filtraron)
  const incidenciasFiltradas = useMemo(() => {
    return filtrarIncidenciasPorMotivo(incidenciasBase, filtros.motivo);
  }, [incidenciasBase, filtros.motivo]);

  const isLoadingIncidencias = listaHook.isLoading;

  const examenSeleccionado = useMemo(() => {
    if (filtros.examenId !== "TODOS") {
      return examenesHook.examenes.find((e) => e.id === filtros.examenId) || null;
    }
    return examenesFiltrados[0] || examenesHook.examenes[0] || null;
  }, [filtros.examenId, examenesHook.examenes, examenesFiltrados]);

  const materiaNombre = useMemo(() => {
    if (filtros.materiaId !== "TODAS") {
      return filtros.materiaId;
    }
    if (examenSeleccionado) {
      return obtenerNombreMateriaIncidencia(examenSeleccionado.nombre);
    }
    return "todas las materias";
  }, [filtros.materiaId, examenSeleccionado]);

  useEffect(() => {
    const updateCount = () => {
      setPendientesOffline(
        offlineIncidenciasService.contarPendientesSync(
          filtros.examenId !== "TODOS" ? filtros.examenId : undefined
        )
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
  }, [filtros.examenId]);

  const handleSincronizar = async () => {
    setIsSyncing(true);
    try {
      const res = await offlineIncidenciasService.sincronizarLote();
      toast.success(
        `Sincronización completada: ${res.totalSincronizados} procesadas, ${res.totalOmitidos} omitidas.`
      );
      listaHook.recargar();
    } catch {
      toast.error("Error al sincronizar incidencias. Verifica la conexión.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Botón "+ Registrar incidencia": SOLO Personal de control (Criterio 2)
  const esPersonalDeControl = rol === "control";
  const puedeAbrirModal =
    esPersonalDeControl &&
    puedeRegistrar &&
    !examenesHook.isLoading &&
    examenesHook.examenes.length > 0;

  function handleModalOpenChange(abierto: boolean) {
    setModalAbierto(abierto);
    if (!abierto && precarga) {
      setPrecarga(null);
      router.replace("/ingresos-rechazados");
    }
  }

  function handleRegistrada(incidencia: Incidencia) {
    if (incidencia.examenId !== filtros.examenId) {
      setFiltros((prev) => ({ ...prev, examenId: incidencia.examenId }));
    } else {
      listaHook.recargar();
    }
  }

  // Criterios 1, 2, 3, 4: Todos los roles con acceso ven "Descargar PDF"
  const puedeDescargarReporte = true;

  const handleSolicitarDescarga = () => {
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

  const handleConfirmarDescarga = async () => {
    if (!examenSeleccionado && examenesHook.examenes.length === 0) return;
    if (isDownloading) return;

    setIsDownloading(true);
    setErrorDescarga(null);

    try {
      const targetExamen = examenSeleccionado || examenesHook.examenes[0];
      const generadorNombre = session?.user?.name || "Usuario del sistema";
      const { blob, filename } = await descargarReporteObservacionesPdf(
        targetExamen,
        incidenciasFiltradas,
        filtros.motivo,
        generadorNombre,
        filtros
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
    } catch (err: unknown) {
      console.error("Error al descargar reporte de observaciones:", err);
      const detalle = err instanceof Error && err.message && err.message !== "Network error" ? `${err.message}. ` : "";
      setErrorDescarga(
        `${detalle}Ocurrió un error al generar el reporte de observaciones. Por favor, reintenta la operación.`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PageContainer
      title="Observaciones de ingreso"
      subtitle="Observaciones de ingreso por examen"
      actionLabel={puedeAbrirModal ? "+ Registrar incidencia" : undefined}
      onAction={() => setModalAbierto(true)}
      headerExtra={
        puedeDescargarReporte ? (
          <Button
            type="button"
            onClick={handleSolicitarDescarga}
            disabled={isDownloading}
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

      {/* Vista con Toolbar de Filtros HU-18 */}
      <ControlIncidenciasView
        rol={rol}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        examenes={examenesHook.examenes}
        examenesLoading={examenesHook.isLoading}
        examenesError={examenesHook.error}
        onReintentarExamenes={examenesHook.reintentar}
        incidencias={incidenciasFiltradas}
        incidenciasLoading={isLoadingIncidencias}
        incidenciasError={listaHook.error}
        onReintentarIncidencias={listaHook.recargar}
      />

      {/* Modal solo para Personal de Control */}
      {puedeAbrirModal && (
        <RegisterIncidenceModal
          open={modalAbierto}
          onOpenChange={handleModalOpenChange}
          examenes={examenesHook.examenes}
          examenIdActual={filtros.examenId !== "TODOS" ? filtros.examenId : examenesHook.examenes[0]?.id ?? null}
          valoresIniciales={precarga}
          onRegistrada={handleRegistrada}
        />
      )}

      {/* Modal de confirmación de descarga para todos los roles */}
      <ConfirmarDescargaObservacionesModal
        isOpen={isModalDescargaOpen}
        onClose={() => setIsModalDescargaOpen(false)}
        onConfirm={handleConfirmarDescarga}
        materiaNombre={materiaNombre}
        gestion={filtros.gestion}
        filtrosAplicados={filtros}
        isDownloading={isDownloading}
        errorDescarga={errorDescarga}
        onRetry={handleConfirmarDescarga}
      />
    </PageContainer>
  );
}

export function IncidenciasPageContainer() {
  return (
    <Suspense fallback={<IncidenciasSkeleton conSelector />}>
      <IncidenciasContenido />
    </Suspense>
  );
}
