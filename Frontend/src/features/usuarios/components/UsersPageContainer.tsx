"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Can } from "@/shared/components/guards/Can";
import { Button } from "@/shared/components/ui/button";
import { useRoles } from "@/features/roles/hooks/useRoles"; // se reutiliza el catálogo de roles del módulo de Roles

import { useUsers } from "../hooks/useUsers";
import { UserActionsBar } from "./UserActionsBar";
import { UserTableToolbar } from "./UserTableToolbar";
import { UserTable } from "./UserTable";
import { UserFormModal } from "./UserFormModal";
import { DisableUserDialog } from "./DisableUserDialog";
import {
  CreateUserFormValues,
  EditUserFormValues,
} from "../schemas/user.schema";
import {
  Usuario,
  UsuarioResumen,
  CreateUsuarioInput,
  UpdateUsuarioInput,
} from "../types/user.types";

const PAGE_SIZE = 10;

export function UsersPageContainer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce: el backend busca del lado del servidor (GET /usuarios?search=...)
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Si cambia la búsqueda, siempre volvemos a la página 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    usuarios,
    usuariosResumen,
    total,
    isLoading,
    isSubmitting,
    createUsuario,
    updateUsuario,
    disableUsuario,
    enableUsuario,
  } = useUsers({ search: debouncedSearch, page, limit: PAGE_SIZE });

  // useRoles() devuelve { roles: RolResumen[], loading, error, ... }, con
  // id: string — compatible tal cual con RolBasico
  const { roles: rolesDisponibles = [] } = useRoles();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | undefined>();
  const [disableTarget, setDisableTarget] = useState<UsuarioResumen | null>(
    null
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleOpenCreate() {
    setFormMode("create");
    setSelectedUsuario(undefined);
    setFormOpen(true);
  }

  function handleOpenEdit(usuarioResumen: UsuarioResumen) {
    // El listado ya trae alcances incluidos, no hace falta pedir el detalle aparte
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
    try {
      await disableUsuario(usuario.id);
      setDisableTarget(null);
    } catch {
      // el toast de error ya lo muestra el hook
    }
  }

  async function handleEnable(usuario: UsuarioResumen) {
    try {
      await enableUsuario(usuario.id);
    } catch {
      // el toast de error ya lo muestra el hook
    }
  }

  return (
    <Can permission="usuarios.ver">
      <div className="space-y-6">
        <UserActionsBar totalUsers={total} onCreateClick={handleOpenCreate} />

        <UserTableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <UserTable
          users={usuariosResumen}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onDisable={setDisableTarget}
          onEnable={handleEnable}
        />

        {/* Paginación */}
        {total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-label text-muted-foreground">
              Página {page} de {totalPages} · {total} usuarios en total
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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