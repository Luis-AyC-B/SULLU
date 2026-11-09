// src/features/registro-ingresos/components/ControlIngresosPageContainer.tsx
"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { EnVivoBadge } from "./EnVivoBadge";
import { IngresosFiltrosToolbar, type RolIngresos } from "./IngresosFiltrosToolbar";
import { IngresosTableToolbar } from "./IngresosTableToolbar";
import { IngresosTable } from "./IngresosTable";
import { BotonDescargarReportePdf } from "./BotonDescargarReportePdf";
import { ConfirmarDescargaModal } from "./ConfirmarDescargaModal";
import { useExamenesControl } from "../hooks/useExamenesControl";
import { useIngresosExamen } from "../hooks/useIngresosExamen";
import { filtrarIngresos } from "../lib/filtrarIngresos";
import { descargarReporteIngresosPdf } from "../api/ingresos.service";
import {
  obtenerGestionPorFecha,
  obtenerGestionVigente,
  type ExamenControl,
  type FiltrosIngresos,
  type IngresosExamen,
} from "../types/ingresos.types";
import { obtenerNombreMateria } from "../lib/generarPdfReporteIngresos";

export function ControlIngresosPageContainer() {
  const { data: session } = useSession();

  // HU-17: Acceso y filtros según el rol base
  // Docente, Personal de Control, Administrador (o rol personalizado con el módulo)
  const userRole = (session?.user?.rol || "").toLowerCase();
  const userEmail = (session?.user?.email || "").toLowerCase();
  const permisos = (session?.user?.permisos || []).map((p: string) => p.toLowerCase());

  const rol: RolIngresos = useMemo(() => {
    if (
      userRole.includes("admin") ||
      userEmail.includes("admin") ||
      permisos.some((p) => p.includes("admin"))
    ) {
      return "admin";
    }
    if (
      userRole.includes("control") ||
      userRole.includes("colaborador") ||
      userEmail.includes("control") ||
      userEmail.includes("colaborador") ||
      permisos.some((p) => p.includes("control") || p.includes("colaborador"))
    ) {
      return "control";
    }
    return "docente";
  }, [userRole, userEmail, permisos]);

  // Criterio 24: Cualquier usuario con acceso al módulo puede descargar el PDF
  const puedeDescargarPdf = Boolean(session?.user);

  const { examenes, isLoading: cargandoExamenes, error: errorExamenes } =
    useExamenesControl();

  // Enriquecer los exámenes con facultades, docentes, gestiones y materias
  const examenesEnriquecidos = useMemo<ExamenControl[]>(() => {
    return examenes.map((e) => ({
      ...e,
      gestion: e.gestion || obtenerGestionPorFecha(e.fecha),
      materia: e.materia || obtenerNombreMateria(e.nombre),
      facultad: e.facultad || "Facultad de Ciencias y Tecnología (FCyT)",
      facultadId: e.facultadId ? String(e.facultadId) : "fcyt",
      docente: e.docente || "Lic. Docente",
      docenteId: e.docenteId ? String(e.docenteId) : "docente-1",
    }));
  }, [examenes]);

  // Filtros combinables para HU-17
  const [filtros, setFiltros] = useState<FiltrosIngresos>({
    facultadId: "TODAS",
    docenteId: "TODOS",
    gestion: obtenerGestionVigente(),
    materiaId: "TODAS",
    examenId: "TODOS",
  });

  // Exámenes que cumplen con los filtros aplicados
  const examenesFiltrados = useMemo(() => {
    return examenesEnriquecidos.filter((e) => {
      if (e.gestion !== filtros.gestion) return false;
      if (
        filtros.facultadId !== "TODAS" &&
        String(e.facultadId) !== filtros.facultadId
      ) {
        return false;
      }
      if (
        filtros.docenteId !== "TODOS" &&
        String(e.docenteId) !== filtros.docenteId
      ) {
        return false;
      }
      if (filtros.materiaId !== "TODAS" && e.materia !== filtros.materiaId) {
        return false;
      }
      if (filtros.examenId !== "TODOS" && String(e.id) !== filtros.examenId) {
        return false;
      }
      return true;
    });
  }, [examenesEnriquecidos, filtros]);

  // ID para polling: si examen específico, su id; si "TODOS", pedimos consolidado "TODOS"
  const idParaCargar = useMemo(() => {
    if (examenes.length === 0) return null;
    if (filtros.examenId !== "TODOS") return filtros.examenId;
    return "TODOS";
  }, [examenes.length, filtros.examenId]);

  const { data: dataHook, conexion } = useIngresosExamen(idParaCargar);

  // Datos activos para tabla y contador
  const dataActiva: IngresosExamen | null = useMemo(() => {
    if (examenes.length === 0 || examenesFiltrados.length === 0) {
      return {
        examenId: filtros.examenId,
        ingresados: 0,
        total: 0,
        ingresos: [],
      };
    }
    return dataHook;
  }, [examenes.length, examenesFiltrados.length, filtros.examenId, dataHook]);

  const [busqueda, setBusqueda] = useState("");

  // Estado para la descarga del PDF (HU-17)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const examenSeleccionado = useMemo(() => {
    if (filtros.examenId !== "TODOS") {
      return (
        examenesEnriquecidos.find((e) => String(e.id) === String(filtros.examenId)) ||
        null
      );
    }
    return examenesFiltrados[0] || examenesEnriquecidos[0] || null;
  }, [examenesEnriquecidos, examenesFiltrados, filtros.examenId]);

  const materiaNombre = useMemo(() => {
    if (filtros.materiaId !== "TODAS") {
      return filtros.materiaId;
    }
    if (filtros.examenId !== "TODOS" && examenSeleccionado) {
      return examenSeleccionado.materia || obtenerNombreMateria(examenSeleccionado.nombre);
    }
    return rol === "docente" ? "Todas mis materias" : "todas las materias";
  }, [filtros.materiaId, filtros.examenId, examenSeleccionado, rol]);

  // Nombres descriptivos para chips de filtros aplicados
  const filtrosDetalle = useMemo(() => {
    const facultadObj = examenesEnriquecidos.find(
      (e) => String(e.facultadId) === filtros.facultadId
    );
    const docenteObj = examenesEnriquecidos.find(
      (e) => String(e.docenteId) === filtros.docenteId
    );
    const examenObj = examenesEnriquecidos.find(
      (e) => String(e.id) === filtros.examenId
    );

    return {
      facultad:
        filtros.facultadId !== "TODAS"
          ? facultadObj?.facultad || filtros.facultadId
          : undefined,
      docente:
        filtros.docenteId !== "TODOS"
          ? docenteObj?.docente || filtros.docenteId
          : undefined,
      examen:
        filtros.examenId !== "TODOS"
          ? examenObj?.nombre || filtros.examenId
          : undefined,
    };
  }, [examenesEnriquecidos, filtros]);

  const ingresosFiltrados = useMemo(
    () => filtrarIngresos(dataActiva?.ingresos ?? [], busqueda),
    [dataActiva, busqueda]
  );

  const cargandoIngresos =
    cargandoExamenes || (idParaCargar !== null && dataHook === null);

  // HU-17: Clic en el botón "Descargar PDF"
  const handleSolicitarDescarga = () => {
    // Si no existen exámenes en el alcance
    if (examenes.length === 0) {
      toast.error("Selecciona un examen para descargar el reporte");
      return;
    }

    // Criterio 20: Dispositivo sin conexión
    const sinConexion =
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      conexion === "desconectado";
    if (sinConexion) {
      toast.error("Necesitas conexión para descargar el reporte");
      return;
    }

    // Criterio 18: Sin ingresos registrados para los filtros vigentes
    const totalIngresos = dataActiva?.ingresados ?? dataActiva?.ingresos?.length ?? 0;
    if (totalIngresos === 0) {
      toast.warning("No hay ingresos registrados para descargar");
      return;
    }

    // Abre el modal de confirmación (Criterio 13)
    setErrorDescarga(null);
    setIsModalOpen(true);
  };

  // HU-17: Confirmar descarga desde el modal
  const handleConfirmarDescarga = async () => {
    if (!dataActiva) return;
    if (isDownloading) return; // Evitar doble clic (Escenario Negativo 7)

    setIsDownloading(true);
    setErrorDescarga(null);

    try {
      const docenteNombre = session?.user?.name || "Docente titular";
      const examenBase =
        examenSeleccionado ||
        examenesFiltrados[0] ||
        examenesEnriquecidos[0] || {
          id: 1,
          nombre: materiaNombre,
          fecha: new Date().toISOString().slice(0, 10),
          gestion: filtros.gestion,
        };

      const { blob, filename } = await descargarReporteIngresosPdf(
        examenBase,
        dataActiva,
        docenteNombre,
        {
          facultad:
            filtrosDetalle.facultad ||
            (filtros.facultadId === "TODAS" ? "Todas las facultades" : undefined),
          docente:
            filtrosDetalle.docente ||
            (filtros.docenteId === "TODOS" ? "Todos los docentes" : undefined),
          gestion: filtros.gestion,
          materia:
            filtros.materiaId === "TODAS" ? "Todas las materias" : filtros.materiaId,
          examen:
            filtrosDetalle.examen ||
            (filtros.examenId === "TODOS" ? "Todos los exámenes" : undefined),
        },
        examenesFiltrados
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

      // Criterio 16: Feedback de reporte descargado
      toast.success("Reporte descargado");
      setIsModalOpen(false);
    } catch (err) {
      // Criterio 19: Manejo de errores con opción de reintentar
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
              ingresados={dataActiva?.ingresados}
              total={dataActiva?.total}
            />
          </div>

          {/* HU-17 Criterios 1, 2, 3, 24: Botón visible para Docente, Control y Administrador */}
          {puedeDescargarPdf && (
            <BotonDescargarReportePdf
              onClick={handleSolicitarDescarga}
              disabled={examenes.length === 0}
              disabledReason={
                examenes.length === 0
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

        {/* Toolbar de filtros combinables en cascada por rol (Criterios 1 a 10) */}
        <IngresosFiltrosToolbar
          rol={rol}
          examenes={examenesEnriquecidos}
          filtros={filtros}
          onFiltrosChange={setFiltros}
          isLoading={cargandoExamenes}
        />

        {/* Barra de búsqueda de estudiante */}
        <div className="w-full">
          <IngresosTableToolbar onSearchChange={setBusqueda} />
        </div>

        {/* Tabla en tiempo real con lista de ingresos y columna de caso excepcional */}
        <IngresosTable
          ingresos={ingresosFiltrados}
          isLoading={cargandoIngresos}
          hayBusqueda={busqueda.trim() !== ""}
          ingresados={dataActiva?.ingresados ?? 0}
          total={dataActiva?.total ?? 0}
        />

        {/* Modal de confirmación de descarga (Criterios 13 a 22) */}
        <ConfirmarDescargaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmarDescarga}
          materiaNombre={materiaNombre}
          gestionNombre={filtros.gestion}
          filtrosDetalle={filtrosDetalle}
          isDownloading={isDownloading}
          errorDescarga={errorDescarga}
          onRetry={handleConfirmarDescarga}
        />
      </div>
    </PageContainer>
  );
}
