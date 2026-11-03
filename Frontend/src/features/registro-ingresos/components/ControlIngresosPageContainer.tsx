// src/features/registro-ingresos/components/ControlIngresosPageContainer.tsx
"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { ControlExamSelectorHeader } from "./ControlExamSelectorHeader";
import { EnVivoBadge } from "./EnVivoBadge";
import { IngresosTableToolbar } from "./IngresosTableToolbar";
import { IngresosTable } from "./IngresosTable";
import { BotonDescargarReportePdf } from "./BotonDescargarReportePdf";
import { ConfirmarDescargaModal } from "./ConfirmarDescargaModal";
import { useExamenesControl } from "../hooks/useExamenesControl";
import { useIngresosExamen } from "../hooks/useIngresosExamen";
import { filtrarIngresos } from "../lib/filtrarIngresos";
import { descargarReporteIngresosPdf } from "../api/ingresos.service";
import { obtenerNombreMateria } from "../lib/generarPdfReporteIngresos";

export function ControlIngresosPageContainer() {
  const { data: session } = useSession();

  // HU-17 Criterio 13: El botón "Descargar PDF" solo se muestra para el rol Docente
  const userRole = (session?.user?.rol || "").toLowerCase();
  const userEmail = (session?.user?.email || "").toLowerCase();
  const isDocente =
    userRole.includes("docente") ||
    userEmail.includes("docente") ||
    Boolean(session?.user?.permisos?.some((p: string) => p.includes("docente")));

  const { examenes, isLoading: cargandoExamenes, error: errorExamenes } =
    useExamenesControl();

  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  // Si el usuario aún no eligió, se usa el primer examen de la lista
  const examenId =
    seleccionado ?? (examenes[0] ? String(examenes[0].id) : null);

  const { data, conexion } = useIngresosExamen(examenId);
  const [busqueda, setBusqueda] = useState("");

  // Estado para la descarga del PDF (HU-17)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const examenSeleccionado = useMemo(
    () => examenes.find((e) => String(e.id) === String(examenId)) || null,
    [examenes, examenId]
  );

  const materiaNombre = useMemo(() => {
    return examenSeleccionado
      ? obtenerNombreMateria(examenSeleccionado.nombre)
      : "el examen";
  }, [examenSeleccionado]);

  const ingresosFiltrados = useMemo(
    () => filtrarIngresos(data?.ingresos ?? [], busqueda),
    [data, busqueda],
  );

  const cargandoIngresos = cargandoExamenes || (examenId !== null && data === null);

  // HU-17: Clic en el botón "Descargar PDF"
  const handleSolicitarDescarga = () => {
    // Criterio 2: Sin examen seleccionado
    if (!examenId || !examenSeleccionado) {
      toast.error("Selecciona un examen para descargar el reporte");
      return;
    }

    // Criterio 10: Dispositivo sin conexión
    const sinConexion =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      conexion === "desconectado";
    if (sinConexion) {
      toast.error("Necesitas conexión para descargar el reporte");
      return;
    }

    // Criterio 8: Examen sin ingresos registrados
    const totalIngresos = data?.ingresados ?? data?.ingresos?.length ?? 0;
    if (totalIngresos === 0) {
      toast.warning("No hay ingresos registrados para descargar");
      return;
    }

    // Abre el modal de confirmación (Criterio 3)
    setErrorDescarga(null);
    setIsModalOpen(true);
  };

  // HU-17: Confirmar descarga desde el modal
  const handleConfirmarDescarga = async () => {
    if (!examenSeleccionado || !data) return;
    if (isDownloading) return; // Evitar doble clic (Escenario Negativo 6)

    setIsDownloading(true);
    setErrorDescarga(null);

    try {
      const docenteNombre = session?.user?.name || "Docente titular";
      const { blob, filename } = await descargarReporteIngresosPdf(
        examenSeleccionado,
        data,
        docenteNombre
      );

      // Descargar el archivo generado en el navegador
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Criterio 6: Feedback de reporte descargado
      toast.success("Reporte descargado");
      setIsModalOpen(false);
    } catch (err) {
      // Criterio 9: Manejo de errores con opción de reintentar
      console.error("Error al descargar reporte de asistencia:", err);
      setErrorDescarga(
        "Ocurrió un error al generar el reporte de asistencia. Por favor, reintenta la operación."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PageContainer
      title="Registro de ingresos"
      subtitle="Lista en tiempo real por examen"
      headerExtra={
        <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto">
          <div className="flex justify-end">
            <EnVivoBadge
              conexion={conexion}
              ingresados={data?.ingresados}
              total={data?.total}
            />
          </div>

          {/* HU-17: Botón visible solo para rol Docente */}
          {isDocente && (
            <BotonDescargarReportePdf
              onClick={handleSolicitarDescarga}
              disabled={!examenId}
              disabledReason={
                !examenId
                  ? "Selecciona un examen para descargar el reporte"
                  : undefined
              }
              isDownloading={isDownloading}
            />
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {errorExamenes && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            No se pudo cargar la lista de exámenes. Recarga la página para intentarlo de nuevo.
          </div>
        )}

        {conexion === "desconectado" && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
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

        {/* HU-17: Modal de confirmación de descarga */}
        <ConfirmarDescargaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmarDescarga}
          materiaNombre={materiaNombre}
          isDownloading={isDownloading}
          errorDescarga={errorDescarga}
          onRetry={handleConfirmarDescarga}
        />
      </div>
    </PageContainer>
  );
}
