"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, AlertCircle } from "lucide-react";
import { examFormSchema, ExamFormValues } from "../schemas/exam.schema";
import { MateriaOption, AmbienteOption } from "../types/exam.types";
import { MOCK_MATERIAS, MOCK_AMBIENTES } from "../hooks/useExams";

interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ExamFormValues) => void;
}

export function ExamFormModal({ isOpen, onClose, onSubmit }: ExamFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
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

  const selectedMateriaId = watch("materiaId");
  const normasValue = watch("normas") || "";

  // Encontrar materia seleccionada para mostrar automáticamente Facultad y Carrera
  const selectedMateria = MOCK_MATERIAS.find(
    (m: MateriaOption) => m.id === selectedMateriaId
  );

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const handleFormSubmit = (data: ExamFormValues) => {
    onSubmit(data);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0a1f44]">
              Registrar Nuevo Examen
            </h2>
            <p className="text-xs text-gray-500">
              Completa los datos del examen a programar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* Materia */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Materia <span className="text-red-500">*</span>
            </label>
            <select
              {...register("materiaId")}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                errors.materiaId
                  ? "border-red-500 focus:border-red-500 bg-red-50/20"
                  : "border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
            >
              <option value="">Selecciona una materia asignada</option>
              {MOCK_MATERIAS.map((m: MateriaOption) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.carreraNombre})
                </option>
              ))}
            </select>
            {errors.materiaId && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.materiaId.message}
              </p>
            )}

            {/* Datos autocompletados de la materia */}
            {selectedMateria && (
              <div className="mt-2 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 border border-gray-100 flex flex-col gap-1">
                <div>
                  <span className="font-semibold text-gray-700">Facultad:</span>{" "}
                  {selectedMateria.facultadNombre}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Carrera:</span>{" "}
                  {selectedMateria.carreraNombre}
                </div>
              </div>
            )}
          </div>

          {/* Tipo de Examen */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tipo de Examen <span className="text-red-500">*</span>
            </label>
            <select
              {...register("tipoExamen")}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                errors.tipoExamen
                  ? "border-red-500 focus:border-red-500 bg-red-50/20"
                  : "border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
            >
              <option value="">Selecciona el tipo de examen</option>
              <option value="Primer parcial">Primer parcial</option>
              <option value="Segundo parcial">Segundo parcial</option>
              <option value="Examen final">Examen final</option>
              <option value="Segunda instancia">Segunda instancia</option>
            </select>
            {errors.tipoExamen && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.tipoExamen.message}
              </p>
            )}
          </div>

          {/* Ambiente Reservado */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Ambiente y Horario Reservado <span className="text-red-500">*</span>
            </label>
            <select
              {...register("ambienteId")}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                errors.ambienteId
                  ? "border-red-500 focus:border-red-500 bg-red-50/20"
                  : "border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
            >
              <option value="">Selecciona un ambiente previamente reservado</option>
              {MOCK_AMBIENTES.map((a: AmbienteOption) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} — [{a.horarioDisponible}]
                </option>
              ))}
            </select>
            {errors.ambienteId && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.ambienteId.message}
              </p>
            )}
          </div>

          {/* Normas del Examen */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Normas del Examen
              </label>
              <span className={`text-[11px] ${normasValue.length > 500 ? "text-red-500 font-bold" : "text-gray-400"}`}>
                {normasValue.length} / 500
              </span>
            </div>
            <textarea
              {...register("normas")}
              rows={3}
              placeholder="Ej. Llevar credencial universitaria, no se permite el uso de celulares..."
              className={`w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                errors.normas
                  ? "border-red-500 focus:border-red-500 bg-red-50/20"
                  : "border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
            />
            {errors.normas && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.normas.message}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0a1f44] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#16366f] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Guardando..." : "Registrar Examen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
