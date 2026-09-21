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
import { Button } from "@/shared/components/ui/button";
import {
    addEstudianteSchema,
    AddEstudianteFormValues,
} from "../schemas/estudiante.schema";
interface AddEstudianteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AddEstudianteFormValues) => Promise<boolean>;
    isSubmitting?: boolean;
}
export function AddEstudianteModal({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting = false,
}: AddEstudianteModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddEstudianteFormValues>({
        resolver: zodResolver(addEstudianteSchema),
        defaultValues: {
            nombre: "",
            apellido: "",
            cod_sis: "",
            ci: "",
        },
    });
    useEffect(() => {
        if (open) {
            reset({
                nombre: "",
                apellido: "",
                cod_sis: "",
                ci: "",
            });
        }

    }, [open, reset]);
    const handleFormSubmit = async (data: AddEstudianteFormValues) => {
        const success = await onSubmit(data);
        if (success) {
            onOpenChange(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Añadir estudiante
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit(handleFormSubmit)}
                    className="space-y-4 pt-2 border-t border-slate-100"
                >
                    {/* Nombre */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Nombre <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            placeholder="Ej. Ana"
                            {...register("nombre")}
                            disabled={isSubmitting}
                        />
                        {errors.nombre && (
                            <p className="text-xs text-rose-500 font-medium">
                                {errors.nombre.message}
                            </p>
                        )}
                    </div>
                    {/* Apellidos */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Apellidos <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            placeholder="Ej. Torres Morales"
                            {...register("apellido")}
                            disabled={isSubmitting}
                        />
                        {errors.apellido && (
                            <p className="text-xs text-rose-500 font-medium">
                                {errors.apellido.message}
                            </p>
                        )}
                    </div>
                    {/* Código SIS */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Código de estudiante (codSIS) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            placeholder="Ej. 202401181"
                            {...register("cod_sis")}
                            disabled={isSubmitting}
                        />
                        {errors.cod_sis && (
                            <p className="text-xs text-rose-500 font-medium">
                                {errors.cod_sis.message}
                            </p>
                        )}
                    </div>
                    {/* CI (Opcional) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Cédula de Identidad (CI)
                        </label>
                        <Input
                            placeholder="Ej. 7891234 (Opcional)"
                            {...register("ci")}
                            disabled={isSubmitting}
                        />
                        {errors.ci && (
                            <p className="text-xs text-rose-500 font-medium">
                                {errors.ci.message}
                            </p>
                        )}
                    </div>
                    <DialogFooter className="pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#002D62] hover:bg-[#00224d] text-white"
                        >
                            {isSubmitting ? "Añadiendo..." : "Añadir estudiante"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


