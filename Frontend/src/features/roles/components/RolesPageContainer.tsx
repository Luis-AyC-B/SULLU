"use client";

import { useState } from "react";
import { useHasPermission } from "@/shared/hooks/useHasPermission";
import { RoleActionsBar } from "./RoleActionsBar";
import { RoleGridContainer } from "./RoleGridContainer";
import { RoleFormModal } from "./RoleFormModal";
import { DeleteRoleDialog } from "./DeleteRoleDialog";
import { useRoles } from "../hooks/useRoles";
import type { RolResumen } from "../types/role.types";
import type { RolFormValues } from "../schemas/role.schema";

export function RolesPageContainer() {
  const puedeVer = useHasPermission("roles.ver");
  const { roles, loading, error, crearRol, editarRol, eliminarRol } = useRoles();

  const [modalOpen, setModalOpen] = useState(false);
  const [rolEditar, setRolEditar] = useState<RolResumen | undefined>();
  const [rolEliminar, setRolEliminar] = useState<RolResumen | null>(null);

  // Defensa extra en la propia página, además del middleware que bloquea la ruta a nivel de servidor.
  if (!puedeVer) {
    return (
      <p className="text-body text-muted-foreground">
        No tienes acceso a este módulo.
      </p>
    );
  }

  const plantillas = roles.filter((r) => r.esPlantilla);

  const abrirCrear = () => {
    setRolEditar(undefined);
    setModalOpen(true);
  };

  const abrirEditar = (rol: RolResumen) => {
    setRolEditar(rol);
    setModalOpen(true);
  };

  const handleSubmit = async (values: RolFormValues) => {
    if (rolEditar) {
      await editarRol(rolEditar.id, values);
    } else {
      await crearRol(values);
    }
  };

  const nombresExistentes = roles
    .filter((r) => r.id !== rolEditar?.id)
    .map((r) => r.nombre);

  return (
    <div className="flex flex-col gap-6">
      <RoleActionsBar onCreate={abrirCrear} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <RoleGridContainer
        roles={roles}
        loading={loading}
        onEdit={abrirEditar}
        onDelete={setRolEliminar}
      />

      <RoleFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        rolEditar={rolEditar}
        plantillas={plantillas}
        nombresExistentes={nombresExistentes}
        onSubmit={handleSubmit}
      />

      <DeleteRoleDialog
        open={!!rolEliminar}
        onOpenChange={(open) => !open && setRolEliminar(null)}
        rol={rolEliminar}
        onConfirm={(rol) => eliminarRol(rol.id)}
      />
    </div>
  );
}