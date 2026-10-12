"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Ambiente, EstadoAmbiente } from "../schemas/ambiente.schema";
import { ambientesApi, GetAmbientesParams } from "../api/ambientes.api";

export function useAmbientes(initialParams?: GetAmbientesParams) {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAmbientes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ambientesApi.getAmbientes(initialParams);
      setAmbientes(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al cargar la lista de ambientes.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialParams]);

  useEffect(() => {
    fetchAmbientes();
  }, [fetchAmbientes]);

  const actualizarEstadoAmbiente = async (
    ambienteId: string | number,
    nuevoEstado: EstadoAmbiente
  ) => {
    const updated = await ambientesApi.updateEstadoAmbiente(ambienteId, nuevoEstado);
    setAmbientes((prev) =>
      prev.map((a) => (String(a.id) === String(ambienteId) ? updated : a))
    );
  };

  const { data: session } = useSession();

  const ambientesFiltrados = useMemo(() => {
    const user = session?.user as {
      rol?: string;
      email?: string;
    } | undefined;

    const rolStr = (user?.rol || "").toLowerCase();
    const emailStr = (user?.email || "").toLowerCase();
    const esAdmin = rolStr.includes("admin") || emailStr.includes("admin");

    // 1. Si es Administrador Total: ve TODOS los ambientes
    if (esAdmin) {
      if (!searchTerm.trim()) return ambientes;
      const q = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return ambientes.filter((amb) =>
        amb.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
      );
    }

    // 2. Para Docentes y usuarios con alcance asignado:
    let facultadClave = "FCYT"; // Por defecto para Tecnología (Edgar, Vladimir, etc.)

    if (emailStr.includes("burgoa") || emailStr.includes("quiroga")) {
      facultadClave = "FCE"; // Economía
    } else if (emailStr.includes("sejas")) {
      facultadClave = "FHCE"; // Humanidades
    } else if (emailStr.includes("zapata")) {
      facultadClave = "FCJP"; // Derecho
    }

    // FILTRO ESTRICTO: Solo ambientes que pertenezcan a su facultad asignada
    const listaAlcance = ambientes.filter((amb) => {
      const nombreAmb = (amb.nombre || "").toUpperCase();
      const facAmb = (amb.facultad || "").toUpperCase();
      return facAmb.includes(facultadClave) || nombreAmb.includes(`(${facultadClave})`);
    });

    // 3. Aplicar el buscador sobre los ambientes de SU alcance
    if (!searchTerm.trim()) return listaAlcance;

    const q = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return listaAlcance.filter((amb) =>
      amb.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
    );
  }, [ambientes, searchTerm, session]);

  return {
    ambientes: ambientesFiltrados,
    totalAmbientes: ambientesFiltrados.length,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    refetch: fetchAmbientes,
    actualizarEstadoAmbiente,
  };
}