"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { ConnectionStatusBadge } from "../shared/ConnectionStatusBadge";
import { ExamenActivoHeaderCard } from "./ExamenActivoHeaderCard";
import { AccionesOperativasGrid } from "./AccionesOperativasGrid";
import { ResumenEnVivoCard } from "./ResumenEnVivoCard";
import { RegistroManualModal } from "../manual/RegistroManualModal";
import { EscanearQrModal } from "../escanear/EscanearQrModal";
import { useResumenEnVivo } from "../../hooks/useResumenEnVivo";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useActiveExam } from "../../store/useActiveExamStore";
import {
  controlIngresoService,
  obtenerTimestampNominaCache,
} from "../../services/control-ingreso.service";
import { offlineIngresosService } from "../../services/offline-ingresos.service";
import { offlineIncidenciasService } from "../../../incidencias/services/offline-incidencias.service";
import { getIngresosExamen } from "../../../registro-ingresos/api/ingresos.service";
import { getIncidenciasExamen } from "../../../incidencias/api/incidencias.service";
import type { ExamenAsignado } from "../../types/control-ingreso.types";

interface ExamenActivoViewProps {
  examen: ExamenAsignado;
}

export function ExamenActivoView({ examen }: ExamenActivoViewProps) {
  const { clearExamenActivo } = useActiveExam();
  const network = useNetworkStatus();
  const { resumen, isLoading, refetch } = useResumenEnVivo(examen.id);
  const [isModalManualOpen, setIsModalManualOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [minutosDesdeActualizacion, setMinutosDesdeActualizacion] = useState<number>(0);

  const prevOnlineRef = useRef(network.isOnline);
  const isExecutingRef = useRef(false);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const recargarDatos = useCallback(
    async (opciones?: { sincronizarPrimero?: boolean }) => {
      if (!examen?.id || isExecutingRef.current) return;

      isExecutingRef.current = true;
      setIsRefreshing(true);
      try {
        if (opciones?.sincronizarPrimero) {
          // Primero sincronizar los pendientes y luego refrescar datos
          await offlineIngresosService.sincronizarLote(examen.id).catch(() => {});
          await offlineIncidenciasService.sincronizarLote(String(examen.id)).catch(() => {});
        }

        await Promise.all([
          controlIngresoService.cargarNominaCompletaExamen(examen.id),
          getIngresosExamen(String(examen.id)).catch(() => []),
          getIncidenciasExamen(String(examen.id)).catch(() => []),
          refetchRef.current?.(),
        ]);

        const ts = obtenerTimestampNominaCache(examen.id);
        if (ts) {
          setMinutosDesdeActualizacion(Math.max(0, Math.floor((Date.now() - ts) / 60000)));
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status === 404) {
          clearExamenActivo();
          return;
        }
      } finally {
        setIsRefreshing(false);
        isExecutingRef.current = false;
      }
    },
    [examen?.id]
  );

  // 1. Cargar datos al elegir examen o montar con internet
  useEffect(() => {
    if (examen?.id) {
      recargarDatos({ sincronizarPrimero: false }).catch(() => {});
    }
  }, [examen?.id, recargarDatos]);

  // 2. Al volver internet: primero sincroniza los pendientes y luego refresca
  useEffect(() => {
    if (!prevOnlineRef.current && network.isOnline) {
      recargarDatos({ sincronizarPrimero: true }).catch(() => {});
    }
    prevOnlineRef.current = network.isOnline;
  }, [network.isOnline, recargarDatos]);

  // 3. Cada 60 segundos con internet refrescar automáticamente
  useEffect(() => {
    if (!network.isOnline) return;
    const interval = setInterval(() => {
      recargarDatos({ sincronizarPrimero: false }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [network.isOnline, recargarDatos]);

  // 4. Actualizar contador de minutos de datos offline cada 30 segundos
  useEffect(() => {
    const updateMins = () => {
      const ts = obtenerTimestampNominaCache(examen.id);
      if (ts) {
        setMinutosDesdeActualizacion(Math.max(0, Math.floor((Date.now() - ts) / 60000)));
      }
    };
    updateMins();
    const interval = setInterval(updateMins, 30000);
    return () => clearInterval(interval);
  }, [examen.id]);

  return (
    <div className="w-full pb-20 md:pb-8 animate-in fade-in duration-300">
      {/* Header Superior según Mockup */}
      <div className="mb-4 md:mb-6">
        <p className="hidden md:block text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-1">
          PERSONAL DE CONTROL
        </p>
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Control de ingreso
          </h1>
          <div className="flex items-center gap-2">
            {!network.isOnline && (
              <span
                className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-semibold select-none"
                title="Antigüedad de los datos locales descargados para escaneo offline"
              >
                {minutosDesdeActualizacion === 0
                  ? "Datos de hace < 1 min"
                  : `Datos de hace ${minutosDesdeActualizacion} min`}
              </span>
            )}
            <button
              type="button"
              onClick={() => recargarDatos({ sincronizarPrimero: true })}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1 rounded-full font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Actualizar nómina de estudiantes e ingresos del servidor"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? "animate-spin text-blue-600" : "text-slate-500"
                }`}
              />
              <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>
            <ConnectionStatusBadge status="sincronizado" />
          </div>
        </div>
      </div>

      {/* Tarjeta Superior del Examen Activo */}
      <ExamenActivoHeaderCard
        examen={examen}
        onCambiarExamen={clearExamenActivo}
      />

      {/* Layout único en columna: Resumen en vivo → Acciones operativas */}
      <div className="flex flex-col gap-4">
        <ResumenEnVivoCard resumen={resumen} isLoading={isLoading} />
        <AccionesOperativasGrid
          onAbrirRegistroManual={() => setIsModalManualOpen(true)}
          onAbrirScanner={() => setIsScannerOpen(true)}
        />
      </div>

      {/* Modal Adaptativo para Registro Manual (Desktop Modal / Mobile Hoja Inferior) */}
      <RegistroManualModal
        examen={examen}
        isOpen={isModalManualOpen}
        onClose={() => setIsModalManualOpen(false)}
        onIngresoExitoso={refetch}
      />

      {/* Modal de Escáner QR continuo en Dispositivos Móviles (HU8) */}
      <EscanearQrModal
        examen={examen}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onIngresoExitoso={refetch}
        onAbrirRegistroManual={() => {
          setIsScannerOpen(false);
          setIsModalManualOpen(true);
        }}
      />
    </div>
  );
}
