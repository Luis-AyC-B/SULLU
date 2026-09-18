"use client";

import { useMemo, useState } from "react";

import { Can } from "@/shared/components/guards/Can";
import { useRoles } from "@/features/roles/hooks/useRoles"; // se reutiliza el catálogo de roles del módulo de Roles

import { useUsers } from "../hooks/useUsers";
import { UserActionsBar } from "./UserActionsBar";
import { UserTableToolbar } from "./UserTableToolbar";
import { UserTable } from "./UserTable";
import { UserFormModal } from "./UserFormModal";
import { DisableUserDialog } from "./DisableUserDialog";
import { CreateUserFormValues, EditUserFormValues } from "../schemas/user.schema";
import {
  Usuario,
  UsuarioResumen,
  CreateUsuarioInput,
  UpdateUsuarioInput,
} from "../types/user.types";

export function UsersPageContainer() {
  const {
    usuarios,
    usuariosResumen,
    isLoading,
    isSubmitting,
    createUsuario,
    updateUsuario,
    disableUsuario,
  } = useUsers();

  // useRoles() devuelve { roles: RolResumen[], loading, error, crearRol, editarRol, eliminarRol, refetch }
  // RolResumen ya trae { id: string, nombre, ... } — compatible con RolBasico
  const { roles: rolesDisponibles = [] } = useRoles();

  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | undefined>();
  const [disableTarget, setDisableTarget] = useState<UsuarioResumen | null>(
    null
  );

  const usuariosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return usuariosResumen;
    return usuariosResumen.filter((u) =>
      u.nombreCompleto.toLowerCase().includes(term)
    );
  }, [usuariosResumen, searchTerm]);

  function handleOpenCreate() {
    setFormMode("create");
    setSelectedUsuario(undefined);
    setFormOpen(true);
  }

  function handleOpenEdit(usuarioResumen: UsuarioResumen) {
    const usuarioCompleto = usuarios.find((u) => u.id === usuarioResumen.id);
    setFormMode("edit");
    setSelectedUsuario(usuarioCompleto);
    setFormOpen(true);
  }

  async function handleFormSubmit(
    values: CreateUserFormValues | EditUserFormValues
  ) {
    if (formMode === "create") {
      await createUsuario(values as CreateUsuarioInput);
    } else {
      await updateUsuario(values as UpdateUsuarioInput);
    }
    setFormOpen(false);
  }

  async function handleConfirmDisable(usuario: UsuarioResumen) {
    await disableUsuario(usuario.id);
    setDisableTarget(null);
  }

  return (
    <Can permission="usuarios.ver">
      <div className="space-y-6">
        <UserActionsBar
          totalUsers={usuariosResumen.length}
          onCreateClick={handleOpenCreate}
        />

        <UserTableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <UserTable
          users={usuariosFiltrados}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onDisable={setDisableTarget}
        />

        <UserFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={formMode}
          usuario={selectedUsuario}
          rolesDisponibles={rolesDisponibles}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />

        <DisableUserDialog
          open={!!disableTarget}
          onOpenChange={(open) => !open && setDisableTarget(null)}
          usuario={disableTarget}
          onConfirm={handleConfirmDisable}
          isSubmitting={isSubmitting}
        />
      </div>
    </Can>
  );
}