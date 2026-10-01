"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { examFormSchema, ExamFormValues } from "../schemas/exam.schema";
import { Exam, MateriaOption, AmbienteOption } from "../types/exam.types";
import { FormField } from "./form/FormField";

interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ExamFormValues) => void;
  materias?: MateriaOption[];   // <--- Materias reales del backend
  ambientes?: AmbienteOption[]; // <--- Ambientes reales del backend
  initialData?: Exam | null;
}

export function ExamFormModal({
  isOpen,
  onClose,
  onSubmit,
  materias = [],   // <--- Recibe materias (por defecto arreglo vacío)
  ambientes = [],  // <--- Recibe ambientes (por defecto arreglo vacío)
  initialData,
}: ExamFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      materiaId: "",
      tipoExamen: undefined,
      ambienteId: "",
      normas: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          materiaId: initialData.materiaId,
          tipoExamen: initialData.tipoExamen,
          ambienteId: initialData.ambienteId,
          normas: initialData.normas || "",
        });
      } else {
        reset({
          materiaId: "",
          tipoExamen: undefined,
          ambienteId: "",
          normas: "",
        });
      }
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  const handleFormSubmit = (data: ExamFormValues) => {
    onSubmit(data);
    reset();
    onClose();
  };


  // Al editar: la reserva actual ya tiene el examen vinculado, por eso getMisAmbientes
  // no la devuelve (solo trae reservas libres). La agregamos manualmente para que
  // el select muestre el ambiente correcto.
  const ambientesConActual = (): AmbienteOption[] => {
    if (!initialData?.ambienteId) return ambientes;
    const yaEsta = ambientes.some((a) => a.id === initialData.ambienteId);
    if (yaEsta) return ambientes;
    const actual: AmbienteOption = {
      id: initialData.ambienteId,
      nombre: initialData.ambienteNombre,
      horarioDisponible: `${initialData.fecha} | ${initialData.horaInicio} - ${initialData.horaFin}`,
    };
    return [actual, ...ambientes];
  };
  const ambienteOptions = ambientesConActual();

  const formatAmbienteLabel = (a: AmbienteOption) => {
  const [fecha = "", horario = ""] = a.horarioDisponible.split("|").map((p) => p.trim());
  const [, mes, dia] = fecha.split("-");
  const fechaCorta = dia && mes ? `${dia}/${mes}` : fecha;
  return `${a.nombre} \u00A0 (${fechaCorta} · ${horario})`;
};

  const inputStyle =
    "w-full rounded-lg border px-3 py-2 text-xs font-normal text-[#1A1D23] outline-none transition-colors border-gray-200 focus:border-blue-500 cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all">
        {/* Encabezado dinámico */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-[#1A1D23]">
            {initialData ? "Editar examen" : "Nuevo examen"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario Modular */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* MATERIA */}
          <FormField label="MATERIA" error={errors.materiaId?.message}>
            <select {...register("materiaId")} className={inputStyle}>
              <option value="" disabled hidden>Materias asignadas</option>
              {materias.map((m: MateriaOption) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </FormField>

          {/* TIPO DE EXAMEN */}
          <FormField label="TIPO DE EXAMEN" error={errors.tipoExamen?.message}>
            <select {...register("tipoExamen")} className={inputStyle}>
              <option value="" disabled hidden>Primer parcial</option>
              <option value="Primer parcial">Primer parcial</option>
              <option value="Segundo parcial">Segundo parcial</option>
              <option value="Examen final">Examen final</option>
              <option value="Segunda instancia">Segunda instancia</option>
            </select>
          </FormField>

          {/* AMBIENTE */}
          <FormField label="AMBIENTE" error={errors.ambienteId?.message}>
            <select {...register("ambienteId")} className={inputStyle}>
              <option value="" disabled hidden>Seleccionar ambiente reservado</option>
              {ambienteOptions.map((a: AmbienteOption) => (
                <option key={a.id} value={a.id} className="py-2.5 my-1">
                  {formatAmbienteLabel(a)}
                </option>
              ))}
            </select>
          </FormField>

          {/* NORMAS DEL EXAMEN */}
          <FormField label="NORMAS DEL EXAMEN" error={errors.normas?.message}>
            <textarea
              {...register("normas")}
              rows={3}
              placeholder="No se permite calculadora. Presentar carnet universitario."
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-xs font-normal text-[#1A1D23] outline-none transition-colors focus:border-blue-500"
            />
          </FormField>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-[#003770] text-xs font-medium text-white shadow-xs hover:bg-[#002a57] disabled:opacity-50 transition-colors cursor-pointer"
              style={{ width: "124px", height: "36px" }}
            >
              {isSubmitting ? "Guardando..." : initialData ? "Guardar cambios" : "Crear examen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}