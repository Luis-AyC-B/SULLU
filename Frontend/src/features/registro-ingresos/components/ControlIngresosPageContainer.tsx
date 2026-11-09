// src/features/registro-ingresos/components/ControlIngresosPageContainer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  obtenerUsuarioOperadorOffline,
  type OfflineUserData,
} from "@/shared/lib/offline-auth";

/**
 * Determina el RolIngresos a partir de la información de sesión disponible.
 *
 * IMPORTANTE: el valor por defecto es "docente" (el más restrictivo en filtros).
 * Solo se asigna "custom" si el nombre del rol es explícitamente distinto de
 * docente/admin/control — es decir, un rol creado en "Gestión de roles".
 */
function determinarRol(
  userRole: string,
  userEmail: string,
  userName: string,
  permisos: string[]
): RolIngresos {
  // 1. Administrador (Facultad, Carrera, Docente, Gestión, Materia, Examen)
  if (
    userRole.includes("admin") ||
    userEmail.includes("admin") ||
    userName.includes("admin") ||
    permisos.some(
      (p) =>
        p.includes("admin") ||
        p.startsWith("usuarios.") ||
        p.startsWith("roles.")
    )
  ) {
    return "admin";
  }

  // 2. Personal de control (Docente, Gestión, Materia, Examen)
  if (
    userRole.includes("control") ||
    userRole.includes("controlador") ||
    userEmail.includes("control") ||
    permisos.some((p) => p.startsWith("control_ingreso."))
  ) {
    return "control";
  }

  // 3. Rol personalizado creado en "Gestión de roles" con acceso al módulo
  //    El nombre del rol debe ser algo diferente a docente/admin/control
  //    (ej: "Coordinador", "Auxiliar", "Supervisor", etc.)
  const esRolPersonalizado =
    userRole !== "" &&
    userRole !== "docente" &&
    userRole !== "rol_docente" &&
    userRole !== "profesor" &&
    userRole !== "usuario" &&
    !userRole.includes("docente") &&
    !userName.includes("docente") &&
    !userEmail.includes("docente");

  if (esRolPersonalizado) {
    return "custom";
  }

  // 4. Rol docente predefinido por el sistema (SOLO Gestión, Materia y Examen)
  //    Es el valor por defecto: si no se detecta otro rol, se asume docente.
  //    Esto garantiza que el filtro "Docente" NUNCA aparece por defecto.
  return "docente";
}

export function ControlIngresosPageContainer() {
  const { data: session } = useSession();

  // Datos offline se cargan SOLO en el cliente después del montaje
  // para evitar hydration mismatch (servidor no tiene localStorage).
  const [offlineOperador, setOfflineOperador] = useState<OfflineUserData | null>(null);
  useEffect(() => {
    setOfflineOperador(obtenerUsuarioOperadorOffline());
  }, []);

  // HU-17: Acceso y filtros según el rol base
  // - "docente"  → rol predefinido por el sistema (solo Gestión, Materia, Examen. NUNCA filtro Docente)
  // - "custom"   → rol personalizado creado a partir de roles con acceso a registro_ingresos (Docente, Gestión, Materia, Examen)
  // - "control"  → personal de control (Docente, Gestión, Materia, Examen)
  // - "admin"    → administrador (Facultad, Carrera, Docente, Gestión, Materia, Examen)
  const userRole = (
    session?.user?.rol ||
    (session?.user as { role?: string })?.role ||
    (session?.user as { rolNombre?: string })?.rolNombre ||
    offlineOperador?.rol ||
    ""
  )
    .toLowerCase()
    .trim();
  const userEmail = (
    session?.user?.email ||
    offlineOperador?.email ||
    ""
  )
    .toLowerCase()
    .trim();
  const userName = (
    session?.user?.name ||
    offlineOperador?.nombre ||
    ""
  )
    .toLowerCase()
    .trim();
  const permisos = (
    (session?.user?.permisos as string[] | undefined) ||
    offlineOperador?.permisos ||
    []
  ).map((p) => String(p).toLowerCase());

  const rol: RolIngresos = useMemo(
    () => determinarRol(userRole, userEmail, userName, permisos),
    [userRole, userEmail, userName, permisos]
  );

  // Criterio 24: Cualquier usuario con acceso al módulo puede descargar el PDF
  const puedeDescargarPdf = Boolean(session?.user);

  const { examenes, isLoading: cargandoExamenes, error: errorExamenes } =
    useExamenesControl();

  // Enriquecer los exámenes: solo la gestión se calcula como fallback
  // a partir de la fecha. Los demás campos (facultad, materia, docente)
  // deben venir del backend directamente.
  const examenesEnriquecidos = useMemo<ExamenControl[]>(() => {
    return examenes.map((e) => ({
      ...e,
      gestion: e.gestion || obtenerGestionPorFecha(e.fecha),
      facultadId: e.facultadId ? String(e.facultadId) : undefined,
      carreraId: e.carreraId ? String(e.carreraId) : (e.carrera ? String(e.carrera) : undefined),
      docenteId: e.docenteId ? String(e.docenteId) : undefined,
    }));
  }, [examenes]);

  // Filtros combinables para HU-17
  const [filtros, setFiltros] = useState<FiltrosIngresos>({
    facultadId: "TODAS",
    carreraId: "TODAS",
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
        filtros.carreraId &&
        filtros.carreraId !== "TODAS" &&
        (e.carreraId ? String(e.carreraId) : e.carrera) !== filtros.carreraId
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
    const carreraObj = examenesEnriquecidos.find(
      (e) => (e.carreraId ? String(e.carreraId) : e.carrera) === filtros.carreraId
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
      carrera:
        filtros.carreraId && filtros.carreraId !== "TODAS"
          ? carreraObj?.carrera || filtros.carreraId
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
      const docenteNombre = session?.user?.name || offlineOperador?.nombre || "Docente titular";
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
          carrera:
            filtrosDetalle.carrera ||
            (filtros.carreraId === "TODAS" ? "Todas las carreras" : undefined),
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
