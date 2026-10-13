"use client";

import { useState, useMemo } from "react";
import { Search, X, Calendar, UserPlus, UserCheck, Info } from "lucide-react";
import { Colaborador } from "../schemas/colaborador.schema";
import { ColaboradorAvatar } from "./ColaboradorAvatar";
import { ColaboradorEstadoBadge } from "./ColaboradorEstadoBadge";
import { AdminSolicitudAprobarModal } from "./AdminSolicitudAprobarModal";
import { AdminSolicitudRechazarModal } from "./AdminSolicitudRechazarModal";

interface AdminColaboradoresViewProps {
  colaboradores: Colaborador[];
  onAprobar: (id: string | number) => Promise<{ success: boolean }>;
  onRechazar: (id: string | number) => Promise<{ success: boolean }>;
}

export function AdminColaboradoresView({
  colaboradores,
  onAprobar,
  onRechazar,
}: AdminColaboradoresViewProps) {
  const [activeTab, setActiveTab] = useState<"solicitudes" | "todos">("solicitudes");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [colaboradorAAprobar, setColaboradorAAprobar] = useState<Colaborador | null>(null);
  const [colaboradorARechazar, setColaboradorARechazar] = useState<Colaborador | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Solicitudes pendientes
  const solicitudesPendientes = useMemo(() => {
    return colaboradores.filter((c) => c.estado === "PENDIENTE");
  }, [colaboradores]);

  // Filtro de tabla "Todos"
  const colaboradoresFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return colaboradores;
    return colaboradores.filter(
      (c) =>
        c.nombreCompleto.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.docenteNombre?.toLowerCase().includes(term)
    );
  }, [colaboradores, searchTerm]);

  const handleConfirmAprobar = async () => {
    if (!colaboradorAAprobar) return;
    try {
      setIsProcessing(true);
      await onAprobar(colaboradorAAprobar.id);
      setColaboradorAAprobar(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRechazar = async () => {
    if (!colaboradorARechazar) return;
    try {
      setIsProcessing(true);
      await onRechazar(colaboradorARechazar.id);
      setColaboradorARechazar(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pestañas estilo Figma (Solicitudes N | Todos) con barra roja inferior */}
      <div className="border-b border-gray-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("solicitudes")}
          className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === "solicitudes"
              ? "text-[#003770]"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>Solicitudes</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
              activeTab === "solicitudes"
                ? "bg-[#003770] text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {solicitudesPendientes.length}
          </span>
          {activeTab === "solicitudes" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("todos")}
          className={`pb-3 font-semibold text-sm transition-all relative cursor-pointer ${
            activeTab === "todos"
              ? "text-[#003770]"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>Todos</span>
          {activeTab === "todos" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
          )}
        </button>
      </div>

      {/* VISTA 1: SOLICITUDES PENDIENTES */}
      {activeTab === "solicitudes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#003770]">
              Solicitudes pendientes
            </h2>
            <span className="text-xs text-gray-500">
              {solicitudesPendientes.length}{" "}
              {solicitudesPendientes.length === 1
                ? "solicitud por revisar"
                : "solicitudes por revisar"}
            </span>
          </div>

          {solicitudesPendientes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <p className="text-sm font-semibold text-gray-600">
                No hay solicitudes pendientes en este momento.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Todas las solicitudes de vinculación han sido revisadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudesPendientes.map((sol) => (
                <div
                  key={sol.id}
                  className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4"
                >
                  {/* Fila superior: badge pendiente, docente solicitante y fecha */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <ColaboradorEstadoBadge estado="PENDIENTE" />
                      <span className="text-slate-600 font-medium">
                        Solicitado por {sol.docenteNombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{sol.fechaSolicitud}</span>
                    </div>
                  </div>

                  {/* Fila central: avatar, nombre y correo */}
                  <div className="flex items-center gap-3">
                    <ColaboradorAvatar nombreCompleto={sol.nombreCompleto} />
                    <div>
                      <h3 className="font-bold text-[#003770] text-base leading-snug">
                        {sol.nombreCompleto}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sol.email}
                      </p>
                    </div>
                  </div>

                  {/* Fila inferior: etiqueta de tipo de usuario y botones de acción */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                    <div>
                      {!sol.usuarioExiste ? (
                        <div className="inline-flex items-center gap-2 bg-[#fff7ed] border border-[#fde68a] text-[#92400e] rounded-xl px-3 py-1.5 text-xs font-semibold">
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Usuario nuevo: se creará la cuenta</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-xl px-3 py-1.5 text-xs font-semibold">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Usuario existente: se vinculará al docente</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setColaboradorARechazar(sol)}
                        className="border border-rose-300 text-rose-600 hover:bg-rose-50 px-5 py-2 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => setColaboradorAAprobar(sol)}
                        className="bg-[#003770] hover:bg-[#002a57] text-white px-5 py-2 font-semibold text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        Aprobar
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Leyenda informativa de figma */}
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Info className="h-4 w-4 text-gray-400 shrink-0" />
                <span>
                  Al aprobar una solicitud, el colaborador quedará vinculado al docente solicitante.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: TABLA DE TODOS (REGISTRO DE COLABORADORES) */}
      {activeTab === "todos" && (
        <div className="space-y-4">
          {/* Buscador y contador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, correo o docente"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:border-[#003770] focus:ring-1 focus:ring-[#003770] transition-colors shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-xs sm:text-sm text-gray-500 font-medium">
              {colaboradores.length} colaboradores · Todos los estados
            </div>
          </div>

          {/* Tarjeta con tabla de registro */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#003770] text-sm sm:text-base">
                Registro de colaboradores
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                {colaboradoresFiltrados.length} colaboradores
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-semibold text-xs">
                    <th className="py-3 px-5">Colaborador</th>
                    <th className="py-3 px-5">Correo</th>
                    <th className="py-3 px-5">Docente</th>
                    <th className="py-3 px-5">Estado</th>
                    <th className="py-3 px-5">Aprobado por</th>
                    <th className="py-3 px-5">Fecha de respuesta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {colaboradoresFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-4 px-5 font-bold text-[#003770]">
                        {item.nombreCompleto}
                      </td>
                      <td className="py-4 px-5 text-gray-500">
                        {item.email}
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-medium">
                        {item.docenteNombre}
                      </td>
                      <td className="py-4 px-5">
                        <ColaboradorEstadoBadge estado={item.estado} />
                      </td>
                      <td className="py-4 px-5 text-gray-500">
                        {item.aprobadoPor || "—"}
                      </td>
                      <td className="py-4 px-5 text-gray-500">
                        {item.fechaRespuesta || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modales de confirmación para Aprobar y Rechazar */}
      <AdminSolicitudAprobarModal
        isOpen={!!colaboradorAAprobar}
        colaborador={colaboradorAAprobar}
        onClose={() => setColaboradorAAprobar(null)}
        onConfirm={handleConfirmAprobar}
        isProcessing={isProcessing}
      />

      <AdminSolicitudRechazarModal
        isOpen={!!colaboradorARechazar}
        colaborador={colaboradorARechazar}
        onClose={() => setColaboradorARechazar(null)}
        onConfirm={handleConfirmRechazar}
        isProcessing={isProcessing}
      />
    </div>
  );
}
