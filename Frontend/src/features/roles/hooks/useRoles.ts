// src/features/roles/hooks/useRoles.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api-client";
import { rolToResumen } from "../lib/role-mapper";
import type { Rol, RolResumen } from "../types/role.types";
import type { RolFormValues } from "../schemas/role.schema";
export function useRoles() {
  const [roles, setRoles] = useState<RolResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Rol[]>("/roles");
      setRoles(data.map(rolToResumen));
    } catch (err: unknown) {
      // Aserción segura desde unknown para evitar el uso de 'any'
      const errorObj = err as { response?: { data?: { message?: string } } };
      const mensajeError = errorObj.response?.data?.message || "Error al cargar los roles del sistema";
      setError(mensajeError);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const crearRol = async (values: RolFormValues) => {
    const { data } = await apiClient.post<Rol>("/roles", values);
    setRoles((prev) => [...prev, rolToResumen(data)]);
  };

  const editarRol = async (id: string, values: RolFormValues) => {
    const { data } = await apiClient.put<Rol>(`/roles/${id}`, values);
    setRoles((prev) => prev.map((r) => (r.id === id ? rolToResumen(data) : r)));
  };

  const eliminarRol = async (id: string) => {
    await apiClient.delete(`/roles/${id}`);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  };

  return { roles, loading, error, crearRol, editarRol, eliminarRol, refetch: fetchRoles };
}