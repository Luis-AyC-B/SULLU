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
import { BotonCasoExcepcional } from "./BotonCasoExcepcional";
import { RegistrarCasoExcepcionalModal } from "./RegistrarCasoExcepcionalModal";
import { ExamenFinalizadoModal } from "./ExamenFinalizadoModal";
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
  type Ingreso,
  type IngresosExamen,
} from "../types/ingresos.types";
import { obtenerNombreMateria } from "../lib/formatoReporteUtils";
import {
  obtenerUsuarioOperadorOffline,
  type OfflineUserData,
} from "@/shared/lib/offline-auth";

/**
 * Determina el RolIngresos a partir de la información de sesión disponible.
 *
 * 1. Admin: ve Facultad, Carrera, Docente, Gestión, Materia, Examen.
 * 2. Docente predefinido: ve SOLO Gestión, Materia y Examen (NUNCA ve filtro Docente).
 *    Tiene prioridad sobre control para evitar falsos positivos por permisos cruzados.
 * 3. Personal de control: ve Docente, Gestión, Materia, Examen.
 * 4. Rol personalizado (creado en "Gestión de roles"): ve Docente, Gestión, Materia, Examen.
 *
 * IMPORTANTE: si userRole está vacío (sesión cargando o sin rol asignado),
 * se devuelve "docente" como valor por defecto más restrictivo.
 */
export function determinarRol(
  userRole: string,
  userEmail: string,
  userName: string,
  permisos: string[]
): RolIngresos {
  const rol = String(userRole || "").toLowerCase().trim();
  const email = String(userEmail || "").toLowerCase().trim();
  const name = String(userName || "").toLowerCase().trim();
  const perms = (permisos || []).map((p) => String(p).toLowerCase().trim());

  // 1. Administrador (Facultad, Carrera, Docente, Gestión, Materia, Examen)
  if (
    rol.includes("admin") ||
    email.includes("admin") ||
    name.includes("admin") ||
    perms.some((p) => p.includes("admin") || p.startsWith("usuarios.") || p.startsWith("roles."))
  ) {
    return "admin";
  }

  // 2. Docente predefinido por el sistema (SOLO Gestión, Materia, Examen — NUNCA filtro Docente)
  // El rol Docente NUNCA ve el filtro Docente.
  const esDocente =
    rol === "docente" ||
    rol.includes("docente") ||
    rol === "profesor" ||
    rol.includes("profesor") ||
    rol === "catedratico" ||
    rol.includes("catedratico") ||
    email.includes("docente") ||
    email.includes("ed.flores") ||
    name.includes("docente") ||
    name.includes("edgar") ||
    name.includes("flores") ||
    perms.includes("colaboradores.solicitar") ||
    perms.includes("ambientes.registrar_reserva") ||
    perms.some((p) => p.startsWith("colaboradores."));

  if (esDocente) {
    return "docente";
  }

  // 3. Personal de control (Docente, Gestión, Materia, Examen)
  if (
    rol.includes("control") ||
    rol.includes("controlador") ||
    email.includes("control") ||
    perms.some((p) => p.startsWith("control_ingreso."))
  ) {
    return "control";
  }

  // 4. Rol personalizado creado en "Gestión de roles" con acceso al módulo
  //    Solo aplica a roles creados específicamente distintos de los predefinidos y genéricos.
  const rolesGenericos = ["", "usuario", "user", "authenticated", "undefined", "null"];
  if (!rolesGenericos.includes(rol)) {
    return "custom";
  }

  // 5. Fallback seguro por defecto: docente (solo Gestión, Materia, Examen)
  return "docente";
}

const FILTROS_STORAGE_KEY = "sullu_registro_ingresos_filtros";

function obtenerFiltrosIniciales(): FiltrosIngresos {
  return {
    facultadId: "TODAS",
    carreraId: "TODAS",
    docenteId: "TODOS",
    gestion: obtenerGestionVigente(),
    materiaId: "TODAS",
    examenId: "TODOS",
  };
}

export function isExamenConcluido(examen: ExamenControl | null): boolean {
  if (!examen) return false;
  const estadoUpper = String(examen.estado || "").toUpperCase();
  if (estadoUpper === "FINALIZADO" || estadoUpper === "CANCELADO") {
    return true;
  }
  if (!examen.fecha || !examen.horario) return false;

  try {
    const partes = examen.horario.split("-");
    if (partes.length < 2) return false;
    const [hFinStr, mFinStr] = partes[1].trim().split(":");
    const [yearStr, monthStr, dayStr] = examen.fecha.split("-");

    const finDate = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
      Number(hFinStr),
      Number(mFinStr),
      0
    );

    return Date.now() >= finDate.getTime();
  } catch {
    return false;
  }
}

export function ControlIngresosPageContainer() {
  const { data: session } = useSession();

  // Sincronización offline en cliente (solo lectura)
  const [offlineOperador, setOfflineOperador] = useState<OfflineUserData | null>(null);
  useEffect(() => {
    setOfflineOperador(obtenerUsuarioOperadorOffline());
  }, []);

  // HU-17: Acceso y filtros según el rol base
  const user = session?.user;

  // Extraer el rol con fallback directo (sesión online o caché offline de sesión)
  const rawRolesArray = (user as { roles?: Array<string | { nombre?: string; name?: string }> })?.roles;
  const rolesArrayStr = Array.isArray(rawRolesArray)
    ? rawRolesArray
        .map((r) => (typeof r === "string" ? r : r?.nombre || r?.name || ""))
        .join(" ")
    : "";

  const userRole = (
    user?.rol ||
    (user as { role?: string } | undefined)?.role ||
    (user as { rolNombre?: string } | undefined)?.rolNombre ||
    rolesArrayStr ||
    offlineOperador?.rol ||
    ""
  ).trim();

  const userEmail = (user?.email || offlineOperador?.email || "").trim();
  const userName = (user?.name || offlineOperador?.nombre || "").trim();
  const permisos = (
    (user?.permisos as string[] | undefined) ||
    offlineOperador?.permisos ||
    []
  ).map((p) => String(p).toLowerCase());

  const rol: RolIngresos = useMemo(
    () => determinarRol(userRole, userEmail, userName, permisos),
    [userRole, userEmail, userName, permisos]
  );

  const isDocente =
    rol === "docente" ||
    userRole.toLowerCase().includes("docente") ||
    userEmail.toLowerCase().includes("docente") ||
    permisos.some((p) => p.includes("docente"));

  // Criterio 24: Cualquier usuario con acceso al módulo puede descargar el PDF
  const puedeDescargarPdf = Boolean(session?.user);

  const { examenes, isLoading: cargandoExamenes, error: errorExamenes } =
    useExamenesControl();

  // Enriquecer los exámenes:
  // - gestión: calculada por fecha si no viene
  // - materia: propiedad materia o inferida del nombre del examen como fallback
  const examenesEnriquecidos = useMemo<ExamenControl[]>(() => {
    return examenes.map((e) => ({
      ...e,
      gestion: e.gestion || obtenerGestionPorFecha(e.fecha),
      materia: e.materia || (e.nombre ? obtenerNombreMateria(e.nombre) : undefined),
      facultadId: e.facultadId ? String(e.facultadId) : undefined,
      carreraId: e.carreraId ? String(e.carreraId) : (e.carrera ? String(e.carrera) : undefined),
      docenteId: e.docenteId ? String(e.docenteId) : undefined,
    }));
  }, [examenes]);

  // Filtros combinables para HU-17 con persistencia por usuario
  const [filtros, setFiltros] = useState<FiltrosIngresos>(obtenerFiltrosIniciales);
  const [isFiltrosLoaded, setIsFiltrosLoaded] = useState(false);

  // Identificador único del usuario autenticado actual (evita mezclar filtros entre roles)
  const currentUserId = useMemo(() => {
    const raw = (session?.user as any)?.id || session?.user?.email || "";
    return String(raw).trim().toLowerCase();
  }, [session?.user]);

  // Carga inicial: Solo restaurar si el usuario actual tiene filtros guardados en esta sesión
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si la sesión no ha terminado de cargar, esperar
    if (!currentUserId) return;

    const userKey = `sullu_ingresos_filtros_${currentUserId}`;
    let saved: Partial<FiltrosIngresos> | null = null;
    try {
      const raw = sessionStorage.getItem(userKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          saved = parsed;
        }
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const urlExamenId = params.get("examenId");
    const urlMateriaId = params.get("materiaId");
    const urlGestion = params.get("gestion");
    const urlFacultadId = params.get("facultadId");
    const urlCarreraId = params.get("carreraId");
    const urlDocenteId = params.get("docenteId");

    // Si el usuario recién entra y no seleccionó nada en esta sesión, arrancar con TODOS
    if (!saved && !urlExamenId && !urlMateriaId) {
      setFiltros(obtenerFiltrosIniciales());
      setIsFiltrosLoaded(true);
      // Limpiar URL si venía con parámetros residuales
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    setFiltros({
      facultadId: urlFacultadId || saved?.facultadId || "TODAS",
      carreraId: urlCarreraId || saved?.carreraId || "TODAS",
      docenteId: urlDocenteId || saved?.docenteId || "TODOS",
      gestion: (urlGestion as any) || saved?.gestion || obtenerGestionVigente(),
      materiaId: urlMateriaId || saved?.materiaId || "TODAS",
      examenId: urlExamenId || saved?.examenId || "TODOS",
    });
    setIsFiltrosLoaded(true);
  }, [currentUserId]);

  // Guardar en sessionStorage del usuario y sincronizar URL SOLO cuando isFiltrosLoaded es true
  useEffect(() => {
    if (!isFiltrosLoaded || !currentUserId || typeof window === "undefined") return;

    const userKey = `sullu_ingresos_filtros_${currentUserId}`;

    try {
      const esEstadoLimpio =
        filtros.examenId === "TODOS" &&
        filtros.materiaId === "TODAS" &&
        filtros.docenteId === "TODOS" &&
        filtros.facultadId === "TODAS" &&
        filtros.carreraId === "TODAS";

      if (esEstadoLimpio) {
        sessionStorage.removeItem(userKey);
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, "", cleanUrl);
      } else {
        sessionStorage.setItem(userKey, JSON.stringify(filtros));

        const params = new URLSearchParams();
        if (filtros.examenId && filtros.examenId !== "TODOS") {
          params.set("examenId", filtros.examenId);
        }
        if (filtros.materiaId && filtros.materiaId !== "TODAS") {
          params.set("materiaId", filtros.materiaId);
        }
        if (filtros.gestion) {
          params.set("gestion", filtros.gestion);
        }
        if (filtros.facultadId && filtros.facultadId !== "TODAS") {
          params.set("facultadId", filtros.facultadId);
        }
        if (filtros.carreraId && filtros.carreraId !== "TODAS") {
          params.set("carreraId", filtros.carreraId);
        }
        if (filtros.docenteId && filtros.docenteId !== "TODOS") {
          params.set("docenteId", filtros.docenteId);
        }
        const newQuery = params.toString();
        const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
        window.history.replaceState(null, "", newUrl);
      }
    } catch {}
  }, [filtros, isFiltrosLoaded, currentUserId]);

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
        rol !== "docente" &&
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

  // Ingresos locales agregados en la sesión (HU-20 casos excepcionales) con persistencia por examen
  const [ingresosAgregados, setIngresosAgregados] = useState<Ingreso[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const params = new URLSearchParams(window.location.search);
      const examenIdUrl = params.get("examenId");
      if (examenIdUrl && examenIdUrl !== "TODOS") {
        const raw = sessionStorage.getItem(`sullu_casos_examen_${examenIdUrl}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) return list;
        }
      }
    } catch {}
    return [];
  });
  const [isCasoModalOpen, setIsCasoModalOpen] = useState(false);
  const [isFinalizadoModalOpen, setIsFinalizadoModalOpen] = useState(false);

  useEffect(() => {
    if (!isFiltrosLoaded) return;
    if (filtros.examenId && filtros.examenId !== "TODOS") {
      try {
        const raw = sessionStorage.getItem(`sullu_casos_examen_${filtros.examenId}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            setIngresosAgregados(list);
            return;
          }
        }
      } catch {}
    }
    setIngresosAgregados([]);
  }, [filtros.examenId, isFiltrosLoaded]);

  const handleAbrirCasoExcepcional = () => {
    if (!examenSeleccionado) {
      toast.error("Selecciona un examen para registrar un caso excepcional");
      return;
    }
    if (isExamenConcluido(examenSeleccionado)) {
      setIsFinalizadoModalOpen(true);
      return;
    }
    setIsCasoModalOpen(true);
  };

  const handleCasoRegistrado = (nuevoIngreso: Ingreso) => {
    setIngresosAgregados((prev) => {
      const actualizados = [nuevoIngreso, ...prev.filter((i) => i.sis !== nuevoIngreso.sis)];
      if (filtros.examenId && filtros.examenId !== "TODOS") {
        try {
          sessionStorage.setItem(
            `sullu_casos_examen_${filtros.examenId}`,
            JSON.stringify(actualizados)
          );
        } catch {}
      }
      return actualizados;
    });
    toast.success("Caso excepcional registrado");
  };

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
    return null;
  }, [examenesEnriquecidos, filtros.examenId]);

  const examenId = examenSeleccionado ? String(examenSeleccionado.id) : null;

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

  const todosLosIngresos = useMemo(() => {
    const base = dataActiva?.ingresos ?? [];
    if (ingresosAgregados.length === 0) return base;
    const baseFiltrada = base.filter(
      (b) => !ingresosAgregados.some((a) => a.sis === b.sis)
    );
    return [...ingresosAgregados, ...baseFiltrada];
  }, [dataActiva?.ingresos, ingresosAgregados]);

  const totalIngresadosCalculado = useMemo(() => {
    const baseCount = dataActiva?.ingresados ?? 0;
    return baseCount + ingresosAgregados.filter(
      (nuevo) => !dataActiva?.ingresos.some((ingreso) => ingreso.sis === nuevo.sis)
    ).length;
  }, [dataActiva?.ingresados, dataActiva?.ingresos, ingresosAgregados]);

  const ingresosFiltrados = useMemo(
    () => filtrarIngresos(todosLosIngresos, busqueda),
    [todosLosIngresos, busqueda]
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

    // Criterio 18: Sin ingresos registrados para los filtros vigentes (incluyendo casos excepcionales HU-20)
    const totalIngresos = Math.max(
      totalIngresadosCalculado,
      todosLosIngresos.length,
      dataActiva?.ingresados ?? 0
    );
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
    const totalIngresos = Math.max(
      totalIngresadosCalculado,
      todosLosIngresos.length,
      dataActiva?.ingresados ?? 0
    );
    if (totalIngresos === 0) return;
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

      const datosParaDescarga: IngresosExamen = {
        examenId: dataActiva?.examenId ?? filtros.examenId,
        total: Math.max(dataActiva?.total ?? 0, totalIngresadosCalculado),
        ingresados: totalIngresadosCalculado,
        ingresos: todosLosIngresos,
      };

      const { blob, filename } = await descargarReporteIngresosPdf(
        examenBase,
        datosParaDescarga,
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
              ingresados={totalIngresadosCalculado}
              total={Math.max(dataActiva?.total ?? 0, totalIngresadosCalculado)}
            />
          </div>

          {/* HU-17 Criterios 1, 2, 3, 24: Botón visible para Docente, Control y Administrador */}
          {puedeDescargarPdf && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {isDocente && (
                <BotonCasoExcepcional
                  onClick={handleAbrirCasoExcepcional}
                  disabled={!examenSeleccionado}
                  disabledReason={
                    !examenSeleccionado
                      ? "Selecciona un examen para registrar casos excepcionales"
                      : undefined
                  }
                />
              )}
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
            </div>
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
          ingresados={totalIngresadosCalculado ?? dataActiva?.ingresados ?? 0}
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

        {/* HU-20: Modal informativo cuando el examen ha concluido */}
        <ExamenFinalizadoModal
          isOpen={isFinalizadoModalOpen}
          onClose={() => setIsFinalizadoModalOpen(false)}
          examenNombre={examenSeleccionado?.nombre}
          horario={examenSeleccionado?.horario}
          fecha={examenSeleccionado?.fecha}
        />

        {/* HU-20: Modal de registro de casos excepcionales */}
        <RegistrarCasoExcepcionalModal
          isOpen={isCasoModalOpen}
          onClose={() => setIsCasoModalOpen(false)}
          examen={examenSeleccionado}
          ingresosActuales={todosLosIngresos}
          onCasoRegistrado={handleCasoRegistrado}
          onExamenFinalizado={() => setIsFinalizadoModalOpen(true)}
        />
      </div>
    </PageContainer>
  );
}
