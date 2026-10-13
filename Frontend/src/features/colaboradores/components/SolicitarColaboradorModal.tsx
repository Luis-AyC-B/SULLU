"use client";

import { useState } from "react";
import { X, Info, AlertCircle } from "lucide-react";
import { SolicitudColaboradorInput, SolicitudColaboradorSchema } from "../schemas/colaborador.schema";

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
  const [email, setEmail] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setEmail("");
    setNombres("");
    setApellidos("");
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === userEmail.trim().toLowerCase()) {
      setErrorMsg("No puedes agregarte a ti mismo como colaborador.");
      return;
    }

    const validation = SolicitudColaboradorSchema.safeParse({
      email: cleanEmail,
      nombres,
      apellidos,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Datos incompletos o inválidos");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onSubmit(validation.data);
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              CORREO ELECTRÓNICO
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@umss.edu.bo"
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-[#003770] focus:ring-1 focus:ring-[#003770] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              NOMBRES
            </label>
            <input
              type="text"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              placeholder="Ingresa los nombres"
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-[#003770] focus:ring-1 focus:ring-[#003770] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              APELLIDOS
            </label>
            <input
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Ingresa los apellidos"
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-[#003770] focus:ring-1 focus:ring-[#003770] transition-colors"
            />
          </div>

          {/* Nota informativa */}
          <div className="flex items-start gap-2 pt-1 text-xs text-gray-500">
            <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
            <span>La solicitud será revisada antes de activar al colaborador.</span>
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
