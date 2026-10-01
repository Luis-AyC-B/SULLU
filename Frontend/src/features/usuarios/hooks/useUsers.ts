"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { userService } from "../services/user.service";
import { mapUsuarioToResumen } from "../lib/user-mapper";
import {
  Usuario,
  UsuarioResumen,
  CreateUsuarioInput,
  UpdateUsuarioInput,
} from "../types/user.types";

interface UseUsersOptions {
  search?: string;
  page?: number;
  limit?: number;
}

/** El backend (Nest) devuelve el mensaje de error en response.data.message */
function getErrorMessage(error: unknown, fallback: string): string {
  const anyError = error as { response?: { data?: { message?: string } } };
  return anyError?.response?.data?.message ?? fallback;
}

export function useUsers({
  search,
  page = 1,
  limit = 10,
}: UseUsersOptions = {}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, total } = await userService.getAll({
        page,
        limit,
        search: search || undefined,
        // Trae también a los dados de baja: la tabla los pinta atenuados
        // (UsuarioResumen.activo = !deletedAt) en vez de ocultarlos del todo.
        incluirInactivos: true,
      });
      setUsuarios(data);
      setTotal(total);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No se pudo cargar la lista de usuarios")
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const createUsuario = useCallback(
    async (payload: CreateUsuarioInput) => {
      setIsSubmitting(true);
      try {
        const { usuario, reactivado } = await userService.create(payload);
        toast.success(
          reactivado
            ? `Se reactivó la cuenta de ${usuario.nombre} ${usuario.apellido}`
            : `Usuario ${usuario.nombre} creado. Se envió la contraseña temporal por correo.`
        );
        await fetchUsuarios();
        return usuario;
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo crear el usuario"));
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchUsuarios]
  );

  const updateUsuario = useCallback(
    async (payload: UpdateUsuarioInput) => {
      setIsSubmitting(true);
      try {
        await userService.update(payload);
        toast.success("Usuario actualizado correctamente");
        await fetchUsuarios();
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo actualizar el usuario"));
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchUsuarios]
  );

  const disableUsuario = useCallback(
    async (id: number) => {
      setIsSubmitting(true);
      try {
        await userService.deactivate(id);
        toast.success("Usuario desactivado");
        await fetchUsuarios();
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo desactivar el usuario"));
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchUsuarios]
  );

  const enableUsuario = useCallback(
    async (id: number) => {
      setIsSubmitting(true);
      try {
        await userService.restore(id);
        toast.success("Usuario reactivado");
        await fetchUsuarios();
      } catch (error) {
        toast.error(getErrorMessage(error, "No se pudo reactivar el usuario"));
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchUsuarios]
  );

  const usuariosResumen: UsuarioResumen[] = usuarios.map(mapUsuarioToResumen);

  return {
    usuarios,
    usuariosResumen,
    total,
    isLoading,
    isSubmitting,
    createUsuario,
    updateUsuario,
    disableUsuario,
    enableUsuario,
    refetch: fetchUsuarios,
  };
}