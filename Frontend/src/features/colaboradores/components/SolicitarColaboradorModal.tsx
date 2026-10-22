"use client";

import { useState, useEffect, useRef } from "react";
import { X, Info, AlertCircle, Search, Loader2 } from "lucide-react";
import {
  SolicitudColaboradorInput,
  EstudianteRegistrado,
} from "../schemas/colaborador.schema";
import { buscarEstudiantesPorCodSis } from "../api/colaboradores.api";

interface SolicitarColaboradorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: SolicitudColaboradorInput) => Promise<{ success: boolean; error?: string }>;
  userEmail: string;
}

export function SolicitarColaboradorModal({
  isOpen,
  onClose,
  onSubmit,
  userEmail,
}: SolicitarColaboradorModalProps) {
  const [codSisInput, setCodSisInput] = useState("");
  const [estudianteSeleccionado, setEstudianteSeleccionado] =
    useState<EstudianteRegistrado | null>(null);

  const [coincidencias, setCoincidencias] = useState<EstudianteRegistrado[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [campoFaltante, setCampoFaltante] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda de códigos SIS a medida que el docente escribe
  useEffect(() => {
    const query = codSisInput.trim();

    if (!query) {
      setCoincidencias([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    // Si ya coincide con el estudiante seleccionado, no hace falta buscar de nuevo
    if (estudianteSeleccionado && estudianteSeleccionado.codSis === query) {
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await buscarEstudiantesPorCodSis(query);
        if (isMounted) {
          setCoincidencias(results);
          setShowDropdown(true);
        }
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [codSisInput, estudianteSeleccionado]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setCodSisInput("");
    setEstudianteSeleccionado(null);
    setCoincidencias([]);
    setErrorMsg(null);
    setCampoFaltante(false);
    setShowDropdown(false);
    onClose();
  };

  const handleCodSisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // Solo números para código SIS
    setCodSisInput(val);
    setErrorMsg(null);
    setCampoFaltante(false);

    // Si modifica el texto, se invalida la selección previa para exigir seleccionar de la lista
    if (estudianteSeleccionado && estudianteSeleccionado.codSis !== val) {
      setEstudianteSeleccionado(null);
    }
  };

  const handleSelectEstudiante = (est: EstudianteRegistrado) => {
    setCodSisInput(est.codSis);
    setEstudianteSeleccionado(est);
    setShowDropdown(false);
    setCampoFaltante(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Criterio: Sin seleccionar un código de la lista no se puede enviar la solicitud
    if (!estudianteSeleccionado || codSisInput.trim() !== estudianteSeleccionado.codSis) {
      setCampoFaltante(true);
      setErrorMsg(
        codSisInput.trim()
          ? "Debes seleccionar un código SIS válido de la lista desplegable."
          : "El campo de Código SIS es obligatorio."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onSubmit({
        codSis: estudianteSeleccionado.codSis,
        nombre: estudianteSeleccionado.nombre,
        apellido: estudianteSeleccionado.apellido,
        email: estudianteSeleccionado.email,
        estudianteId: estudianteSeleccionado.id,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Error al enviar la solicitud");
      } else {
        handleClose();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200/80 p-6 sm:p-7 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#003770]">Solicitar colaborador</h2>
          <p className="text-sm text-gray-500 mt-1">
            Invita a una persona a tu equipo de control.
          </p>
        </div>

        {/* Mensaje de error si existe */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. CAMPO CÓDIGO SIS CON BÚSQUEDA Y AUTOCOMPLETADO */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              CÓDIGO SIS
            </label>
            <div className="relative">
              <input
                type="text"
                value={codSisInput}
                onChange={handleCodSisChange}
                onFocus={() => {
                  if (codSisInput.trim().length > 0) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Ingresa el código SIS"
                disabled={isSubmitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:outline-none transition-colors ${
                  campoFaltante
                    ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                    : "border-gray-200 focus:border-[#003770] focus:ring-1 focus:ring-[#003770]"
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#003770]" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* Lista de coincidencias con códigos SIS (sin nombre ni apellido, según criterio) */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto animate-in fade-in duration-150">
                {coincidencias.length === 0 ? (
                  <div className="p-3 text-xs text-rose-600 font-medium text-center">
                    No se encontraron estudiantes con ese código SIS
                  </div>
                ) : (
                  <div className="py-1 divide-y divide-gray-100">
                    {coincidencias.map((est) => (
                      <button
                        key={est.id}
                        type="button"
                        onClick={() => handleSelectEstudiante(est)}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-blue-50/80 hover:text-[#003770] transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-mono tracking-wider">{est.codSis}</span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          Seleccionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CAMPO NOMBRE (Autocompletado, no se edita a mano) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              NOMBRE
            </label>
            <input
              type="text"
              value={estudianteSeleccionado?.nombre || ""}
              readOnly
              tabIndex={-1}
              placeholder="Se autocompleta con el código SIS"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-slate-700 placeholder-gray-400 cursor-not-allowed select-none focus:outline-none"
            />
          </div>

          {/* 3. CAMPO APELLIDO (Autocompletado, no se edita a mano) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              APELLIDO
            </label>
            <input
              type="text"
              value={estudianteSeleccionado?.apellido || ""}
              readOnly
              tabIndex={-1}
              placeholder="Se autocompleta con el código SIS"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-slate-700 placeholder-gray-400 cursor-not-allowed select-none focus:outline-none"
            />
          </div>



          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#003770] hover:bg-[#002a57] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
