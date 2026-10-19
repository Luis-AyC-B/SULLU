"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Colaborador, SolicitudColaboradorInput } from "../schemas/colaborador.schema";
import * as api from "../api/colaboradores.api";

export function useColaboradores() {
  const { data: session } = useSession();

  // Para docente: su nómina
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  // Para admin: solicitudes PENDIENTES (pestaña "Solicitudes")
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<Colaborador[]>([]);
  // Para admin: todos los registros (pestaña "Todos")
  const [todosAdmin, setTodosAdmin] = useState<Colaborador[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [activeTab, setActiveTab] = useState<"nomina" | "solicitudes">("nomina");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = ((session?.user as any)?.rol || "").toLowerCase();
  const isAdmin = userRole.includes("admin");
  // userEmail se mantiene por si algún componente lo necesita para mostrar en UI
  const userEmail = session?.user?.email || "";

  const fetchColaboradores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAdmin) {
        // Admin carga dos endpoints en paralelo: solo pendientes para solicitudes, y todos para el registro
        const [solicitudes, todos] = await Promise.all([
          api.getSolicitudesPendientesAdmin(),
          api.getTodosAdmin(),
        ]);
        setSolicitudesPendientes(solicitudes);
        setTodosAdmin(todos);
        // Para compatibilidad con componentes que usen `colaboradores` en admin,
        // exponemos los todos (todos los estados)
        setColaboradores(todos);
      } else {
        // Docente carga su nómina (el backend filtra por el JWT)
        const data = await api.getColaboradores();
        setColaboradores(data);
      }
    } catch (err: unknown) {
      console.error("Error al cargar colaboradores:", err);
      setError(err instanceof Error ? err.message : "Error al cargar los colaboradores");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  // Filtrado por buscador y estado (para vista docente)
  const colaboradoresFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return colaboradores.filter((col) => {
      const matchSearch =
        term === "" ||
        col.nombreCompleto.toLowerCase().includes(term) ||
        (col.codSis && col.codSis.toLowerCase().includes(term)) ||
        col.email.toLowerCase().includes(term);

      const matchEstado =
        filtroEstado === "TODOS" || col.estado === filtroEstado;

      return matchSearch && matchEstado;
    });
  }, [colaboradores, searchTerm, filtroEstado]);

  // Conteo según mockups ("5 colaboradores · 2 aprobados")
  const totales = useMemo(() => {
    const total = colaboradores.length;
    const aprobados = colaboradores.filter((c) => c.estado === "APROBADO").length;
    const pendientes = colaboradores.filter((c) => c.estado === "PENDIENTE").length;
    const rechazados = colaboradores.filter((c) => c.estado === "RECHAZADO").length;
    const inactivos = colaboradores.filter((c) => c.estado === "INACTIVO").length;

    return { total, aprobados, pendientes, rechazados, inactivos };
  }, [colaboradores]);

  // Acciones
  const solicitar = async (input: SolicitudColaboradorInput) => {
    try {
      const nuevo = await api.solicitarColaborador(input);
      setColaboradores((prev) => [nuevo, ...prev]);
      return { success: true, data: nuevo };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar la solicitud";
      return { success: false, error: msg };
    }
  };

  const darDeBaja = async (id: string | number) => {
    try {
      const actualizado = await api.darDeBajaColaborador(id);
      setColaboradores((prev) =>
        prev.map((c) => (String(c.id) === String(id) ? actualizado : c))
      );
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al dar de baja";
      return { success: false, error: msg };
    }
  };

  const aprobar = async (id: string | number) => {
    try {
      await api.aprobarSolicitud(id);
      // Recargamos ambas listas para reflejar el cambio de PENDIENTE → APROBADO
      await fetchColaboradores();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aprobar la solicitud";
      return { success: false, error: msg };
    }
  };

  const rechazar = async (id: string | number) => {
    try {
      await api.rechazarSolicitud(id);
      // Recargamos ambas listas para reflejar el cambio de PENDIENTE → RECHAZADO
      await fetchColaboradores();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al rechazar la solicitud";
      return { success: false, error: msg };
    }
  };

  return {
    colaboradores,
    colaboradoresFiltrados,
    solicitudesPendientes,
    todosAdmin,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtroEstado,
    setFiltroEstado,
    activeTab,
    setActiveTab,
    totales,
    isAdmin,
    userEmail,
    solicitar,
    darDeBaja,
    aprobar,
    rechazar,
    refetch: fetchColaboradores,
  };
}
