// src/features/roles/hooks/useRoles.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/shared/lib/api-client";
import { rolToResumen } from "../lib/role-mapper";
import type { Rol, RolResumen } from "../types/role.types";
import type { RolFormValues } from "../schemas/role.schema";

// TODO: quitar este mock cuando el backend tenga /roles funcionando de verdad.
const ROLES_MOCK: Rol[] = [
  {
    id: "1",
    nombre: "Administrador",
    descripcion: "Acceso completo al sistema",
    esPlantilla: true,
    colorBadge: "blue",
    usuariosAsignados: 2,
    permisos: [
      "usuarios.ver", "usuarios.crear", "usuarios.editar", "usuarios.desactivar",
      "roles.ver", "roles.crear", "roles.editar", "roles.eliminar",
      "estudiantes.ver", "estudiantes.registrar", "estudiantes.habilitar",
      "examenes.ver", "examenes.crear", "examenes.editar", "examenes.eliminar",
    ],
  },
  {
    id: "2",
    nombre: "Docente",
    descripcion: "Gestión de sus propios exámenes y estudiantes",
    esPlantilla: true,
    colorBadge: "red",
    usuariosAsignados: 14,
    permisos: ["estudiantes.ver", "estudiantes.registrar", "examenes.editar"],
  },
  {
    id: "3",
    nombre: "Control de ingreso",
    descripcion: "Operación en tiempo real durante el examen",
    esPlantilla: true,
    colorBadge: "green",
    usuariosAsignados: 8,
    permisos: ["examenes.ver", "estudiantes.ver"],
  },
];

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
    } catch {
      // Backend aún no disponible: usar mock para poder probar la UI.
      setRoles(ROLES_MOCK.map(rolToResumen));
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