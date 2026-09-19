"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";

import {
  createUserSchema,
  editUserSchema,
  CreateUserFormValues,
  EditUserFormValues,
} from "../schemas/user.schema";
import { RolBasico, Usuario } from "../types/user.types";

type UserFormValues = CreateUserFormValues | EditUserFormValues;

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Usuario a editar; ignorado si mode === "create" */
  usuario?: Usuario;
  /** Catálogo de roles disponibles para el selector (viene de useRoles) */
  rolesDisponibles: RolBasico[];
  onSubmit: (values: UserFormValues) => void;
  isSubmitting?: boolean;
}

export function UserFormModal({
  open,
  onOpenChange,
  mode,
  usuario,
  rolesDisponibles,
  onSubmit,
  isSubmitting,
}: UserFormModalProps) {
  const isEdit = mode === "edit";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? editUserSchema : createUserSchema),
    defaultValues: isEdit
      ? {
          id: usuario?.id,
          nombre: usuario?.nombre ?? "",
          apellido: usuario?.apellido ?? "",
          telefono: usuario?.telefono ?? "",
          rolesIds: usuario?.roles.map((r) => r.id) ?? [],
        }
      : {
          nombre: "",
          apellido: "",
          correo: "",
          telefono: "",
          rolesIds: [],
        },
  });

  // Resetea el form cada vez que se abre el modal o cambia el usuario a editar
  useEffect(() => {
    if (!open) return;
    reset(
      isEdit
        ? {
            id: usuario?.id,
            nombre: usuario?.nombre ?? "",
            apellido: usuario?.apellido ?? "",
            telefono: usuario?.telefono ?? "",
            rolesIds: usuario?.roles.map((r) => r.id) ?? [],
          }
        : {
            nombre: "",
            apellido: "",
            correo: "",
            telefono: "",
            rolesIds: [],
          }
    );
  }, [open, isEdit, usuario, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-headline text-2xl">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 border-t border-border pt-4"
        >
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-label uppercase text-muted-foreground">
              Nombre
            </label>
            <Input placeholder="Juan" {...register("nombre")} />
            {errors.nombre && (
              <p className="text-label text-destructive">
                {errors.nombre.message}
              </p>
            )}
          </div>

          {/* Apellidos */}
          <div className="space-y-1.5">
            <label className="text-label uppercase text-muted-foreground">
              Apellidos
            </label>
            <Input placeholder="García Pérez" {...register("apellido")} />
            {errors.apellido && (
              <p className="text-label text-destructive">
                {errors.apellido.message}
              </p>
            )}
          </div>

          {/* Correo institucional: solo en creación, no se edita */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-label uppercase text-muted-foreground">
                Correo institucional
              </label>
              <Input
                type="email"
                placeholder="usuario@universidad.edu"
                {...register("correo" as const)}
              />
              {"correo" in errors && errors.correo && (
                <p className="text-label text-destructive">
                  {errors.correo.message as string}
                </p>
              )}
            </div>
          )}

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-label uppercase text-muted-foreground">
              Teléfono
            </label>
            <Input placeholder="+123 000000" {...register("telefono")} />
            {errors.telefono && (
              <p className="text-label text-destructive">
                {errors.telefono.message}
              </p>
            )}
          </div>

          {/* Roles: multi-select con checkboxes (un usuario puede tener más de uno) */}
          <div className="space-y-1.5">
            <label className="text-label uppercase text-muted-foreground">
              Rol
            </label>
            <Controller
              name="rolesIds"
              control={control}
              render={({ field }) => (
                <div className="space-y-2 rounded-md border border-border p-3">
                  {rolesDisponibles.map((rol) => {
                    const checked = field.value?.includes(rol.id) ?? false;
                    return (
                      <label
                        key={rol.id}
                        className="flex items-center gap-2 text-body"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(isChecked) => {
                            const current: string[] = field.value ?? [];
                            field.onChange(
                              isChecked
                                ? [...current, rol.id]
                                : current.filter((id) => id !== rol.id)
                            );
                          }}
                        />
                        {rol.nombre}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.rolesIds && (
              <p className="text-label text-destructive">
                {errors.rolesIds.message as string}
              </p>
            )}
          </div>

          {/* Contraseña temporal: informativa, no editable. La genera el backend */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-label uppercase text-muted-foreground">
                Contraseña temporal
              </label>
              <Input
                disabled
                placeholder="Se enviará por correo"
                className="text-muted-foreground"
              />
              <p className="text-label text-muted-foreground">
                El usuario deberá cambiarla en su primer ingreso.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}