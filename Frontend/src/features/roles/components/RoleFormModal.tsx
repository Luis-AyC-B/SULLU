// src/features/roles/components/RoleFormModal.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { RolePermissionMatrix } from "./RolePermissionMatrix";
import { createRolSchema, type RolFormValues } from "../schemas/role.schema";
import type { RolResumen } from "../types/role.types";

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolEditar?: RolResumen; // undefined = modo "crear"
  plantillas: RolResumen[]; // los 3 roles base, para precargar permisos
  nombresExistentes: string[]; // para validar duplicado (excluye el propio si edita)
  onSubmit: (data: RolFormValues) => void;
}

const BADGE_STYLES: Record<RolResumen["colorBadge"], string> = {
  blue: "bg-primary/10 text-primary border-primary/20",
  red: "bg-destructive/10 text-destructive border-destructive/20",
  green: "bg-success/10 text-success border-success/20",
  gray: "bg-muted text-muted-foreground border-border",
};

export function RoleFormModal({
  open,
  onOpenChange,
  rolEditar,
  plantillas,
  nombresExistentes,
  onSubmit,
}: RoleFormModalProps) {
  const esEdicionDeBase = !!rolEditar?.esPlantilla;

  const form = useForm<RolFormValues>({
    resolver: zodResolver(createRolSchema(nombresExistentes)),
    defaultValues: {
      nombre: rolEditar?.nombre ?? "",
      descripcion: rolEditar?.descripcion ?? "",
      plantillaBaseId: "",
      permisos: rolEditar?.permisos ?? [],
    },
  });

  // Resetea el form cada vez que cambia qué rol se está editando (o se abre en modo crear)
  useEffect(() => {
    form.reset({
      nombre: rolEditar?.nombre ?? "",
      descripcion: rolEditar?.descripcion ?? "",
      plantillaBaseId: "",
      permisos: rolEditar?.permisos ?? [],
    });
  }, [rolEditar, form]);

  const nombre = form.watch("nombre");
  const descripcion = form.watch("descripcion");
  const permisos = form.watch("permisos");

  const aplicarPlantilla = (plantillaId: string) => {
    const plantilla = plantillas.find((p) => p.id === plantillaId);
    if (!plantilla) return;
    form.setValue("plantillaBaseId", plantillaId);
    form.setValue("permisos", plantilla.permisos);
  };

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-headline text-primary">
            {rolEditar ? "Editar rol" : "Nuevo rol"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-label mb-1.5 block text-foreground">
              NOMBRE DEL ROL
            </label>
            <Input
              {...form.register("nombre")}
              maxLength={50}
              placeholder="Ej. Coordinador de sede"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-destructive">
                {form.formState.errors.nombre?.message}
              </span>
              <span className="text-muted-foreground">{nombre.length}/50</span>
            </div>
          </div>

          <div>
            <label className="text-label mb-1.5 block text-foreground">
              DESCRIPCIÓN
            </label>
            <Input
              {...form.register("descripcion")}
              maxLength={1000}
              placeholder="Breve descripción de responsabilidades"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-destructive">
                {form.formState.errors.descripcion?.message}
              </span>
              <span className="text-muted-foreground">
                {descripcion.length}/1000
              </span>
            </div>
          </div>

          {!esEdicionDeBase && (
            <div>
              <label className="text-label mb-1.5 block text-foreground">
                PLANTILLAS
              </label>
              <Select onValueChange={aplicarPlantilla}>
                <SelectTrigger>
                  <SelectValue placeholder="(roles predeterminados)" />
                </SelectTrigger>
                <SelectContent>
                  {plantillas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-2 flex flex-wrap gap-2">
                {plantillas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => aplicarPlantilla(p.id)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${BADGE_STYLES[p.colorBadge]}`}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          <fieldset disabled={esEdicionDeBase}>
            <RolePermissionMatrix
              seleccionados={permisos}
              onChange={(nuevos) => form.setValue("permisos", nuevos)}
            />
            {esEdicionDeBase && (
              <p className="mt-2 text-xs text-muted-foreground">
                Los permisos de los roles base del sistema no se pueden modificar.
              </p>
            )}
          </fieldset>

          {form.formState.errors.permisos && (
            <p className="text-xs text-destructive">
              {form.formState.errors.permisos.message}
            </p>
          )}

          <DialogFooter className="flex items-center justify-between border-t border-border pt-4 sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {permisos.length} permisos seleccionados
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {rolEditar ? "Guardar cambios" : "Crear rol"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}