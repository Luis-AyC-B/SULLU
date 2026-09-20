"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import {
  createUserSchema,
  editUserSchema,
  CreateUserFormValues,
  EditUserFormValues,
} from "../schemas/user.schema";
import { RolBasico, Usuario, CatalogoAcademico } from "../types/user.types";
import { userService } from "../services/user.service";

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

  const [catalogos, setCatalogos] = useState<CatalogoAcademico | null>(null);

  useEffect(() => {
    userService.getCatalogosAcademicos().then(setCatalogos).catch(console.error);
  }, []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
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
          alcances: usuario?.alcances ?? [],
        }
      : {
          nombre: "",
          apellido: "",
          correo: "",
          telefono: "",
          rolesIds: [],
          alcances: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "alcances",
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
            alcances: usuario?.alcances ?? [],
          }
        : {
            nombre: "",
            apellido: "",
            correo: "",
            telefono: "",
            rolesIds: [],
            alcances: [],
          }
    );
  }, [open, isEdit, usuario, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-headline text-2xl">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="custom-scrollbar flex-1 space-y-4 overflow-y-auto border-t border-border pt-4 pr-2"
          style={{ scrollbarWidth: "thin" }}
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

          {/* Alcances (Facultad, Carrera opcional, Materia opcional) */}
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-label uppercase text-muted-foreground">
                Alcance (Facultad / Carrera / Materia)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() =>
                  append({ facultadId: 0, carreraId: 0, materiaId: 0 })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar alcance
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No tiene ningún alcance asignado.
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => {
                const facultadId = watch(`alcances.${index}.facultadId`);
                const carreraId = watch(`alcances.${index}.carreraId`);
                const materiaId = watch(`alcances.${index}.materiaId`);

                const carrerasDeFacultad =
                  catalogos?.carreras.filter(
                    (c) => c.facultadId === facultadId
                  ) ?? [];

                let resumen = "Elegí al menos una facultad";
                if (facultadId && !carreraId)
                  resumen = "Alcance: toda la facultad";
                else if (facultadId && carreraId && !materiaId)
                  resumen = "Alcance: toda la carrera";
                else if (facultadId && carreraId && materiaId)
                  resumen = "Alcance: solo esa materia";

                return (
                  <div
                    key={field.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      {/* Select Facultad */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Facultad
                        </label>
                        <Controller
                          control={control}
                          name={`alcances.${index}.facultadId`}
                          render={({ field }) => (
                            <Select
                              onValueChange={(val) => {
                                field.onChange(Number(val));
                                // al cambiar de facultad, la carrera y materia
                                // elegidas antes ya no tienen sentido
                                setValue(`alcances.${index}.carreraId`, 0);
                                setValue(`alcances.${index}.materiaId`, 0);
                              }}
                              value={field.value ? String(field.value) : ""}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Facultad..." />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogos?.facultades.map((f) => (
                                  <SelectItem key={f.id} value={String(f.id)}>
                                    {f.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Select Carrera: filtrada por la facultad elegida; opcional */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Carrera
                        </label>
                        <Controller
                          control={control}
                          name={`alcances.${index}.carreraId`}
                          render={({ field }) => (
                            <Select
                              disabled={!facultadId}
                              onValueChange={(val) => {
                                field.onChange(Number(val));
                                setValue(`alcances.${index}.materiaId`, 0);
                              }}
                              value={field.value ? String(field.value) : "0"}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={
                                    facultadId
                                      ? "Toda la facultad"
                                      : "Elegí primero una facultad"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  Toda la facultad
                                </SelectItem>
                                {carrerasDeFacultad.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Select Materia: opcional, requiere carrera elegida */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Materia
                        </label>
                        <Controller
                          control={control}
                          name={`alcances.${index}.materiaId`}
                          render={({ field }) => (
                            <Select
                              disabled={!carreraId}
                              onValueChange={(val) =>
                                field.onChange(Number(val))
                              }
                              value={field.value ? String(field.value) : "0"}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={
                                    carreraId
                                      ? "Toda la carrera"
                                      : "Elegí primero una carrera"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  Toda la carrera
                                </SelectItem>
                                {/* TODO: idealmente filtrar por carreraId (Carrera_Materia);
                                    por ahora se listan todas si el catálogo no trae esa relación */}
                                {catalogos?.materias.map((m) => (
                                  <SelectItem key={m.id} value={String(m.id)}>
                                    {m.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Botón Eliminar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-end text-destructive sm:mb-[2px]"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="mt-2 text-label text-muted-foreground">
                      {resumen}
                    </p>
                  </div>
                );
              })}
            </div>
            {errors.alcances && !Array.isArray(errors.alcances) && (
              <p className="text-label text-destructive">
                {errors.alcances.message as string}
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
        </form>

        <DialogFooter className="mt-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={isSubmitting}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}