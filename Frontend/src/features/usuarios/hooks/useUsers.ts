"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { userService } from "../services/user.service";
import { mapUsuarioToResumen } from "../lib/user-mapper";
import { Usuario } from "../types/user.types";
import {
  UsuarioResumen,
  CreateUsuarioInput,
  UpdateUsuarioInput,
} from "../types/user.types";

// TODO: quitar este mock cuando el backend tenga /usuarios funcionando de verdad.
const USUARIOS_MOCK: Usuario[] = [
  {
    id: 1,
    nombre: "Ana",
    apellido: "Rondón Arco",
    correo: "arondon@universidad.edu",
    telefono: "+591 70000001",
    deletedAt: null,
    roles: [{ id: "1", nombre: "Administrador" }],
  },
  {
    id: 2,
    nombre: "Luis",
    apellido: "Medina Zanabria",
    correo: "lmedina@universidad.edu",
    telefono: "+591 70000002",
    deletedAt: null,
    roles: [
      { id: "2", nombre: "Docente" },
      { id: "1", nombre: "Administrador" },
    ],
  },
  {
    id: 3,
    nombre: "Carlos",
    apellido: "Jimenez Prado",
    correo: "cjimenez@universidad.edu",
    telefono: "+591 70000003",
    deletedAt: null,
    roles: [{ id: "3", nombre: "Control de ingreso" }],
  },
];

export function useUsers() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await userService.getAll();
      // El backend todavía puede no devolver un array (404, HTML de error, etc.)
      if (!Array.isArray(data)) {
        throw new Error("respuesta_invalida");
      }
      setUsuarios(data);
    } catch {
      // Backend aún no disponible: usar mock para poder probar la UI.
      setUsuarios(USUARIOS_MOCK);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      } catch {
        toast.error("No se pudo crear el usuario");
        throw new Error("create_usuario_failed");
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
      } catch {
        toast.error("No se pudo actualizar el usuario");
        throw new Error("update_usuario_failed");
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
      } catch {
        toast.error("No se pudo desactivar el usuario");
        throw new Error("disable_usuario_failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchUsuarios]
  );

  const usuariosResumen: UsuarioResumen[] = (
    Array.isArray(usuarios) ? usuarios : []
  ).map(mapUsuarioToResumen);

  return {
    usuarios,
    usuariosResumen,
    isLoading,
    isSubmitting,
    createUsuario,
    updateUsuario,
    disableUsuario,
    refetch: fetchUsuarios,
  };
}