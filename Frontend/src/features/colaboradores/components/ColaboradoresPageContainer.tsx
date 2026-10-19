"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, X, ShieldAlert, Loader2 } from "lucide-react";
import { Colaborador, SolicitudColaboradorInput } from "../schemas/colaborador.schema";
import { useColaboradores } from "../hooks/useColaboradores";
import { ColaboradorCard } from "./ColaboradorCard";
import { SolicitarColaboradorModal } from "./SolicitarColaboradorModal";
import { GestionarExamenesModal } from "./GestionarExamenesModal";
import { DarDeBajaDialog } from "./DarDeBajaDialog";
import { AdminColaboradoresView } from "./AdminColaboradoresView";

export function ColaboradoresPageContainer() {
  const { data: session, status } = useSession();
  const {
    colaboradores,
    colaboradoresFiltrados,
    solicitudesPendientes,
    todosAdmin,
    loading,
    searchTerm,
    setSearchTerm,
    totales,
    isAdmin,
    userEmail,
    solicitar,
    darDeBaja,
    aprobar,
    rechazar,
    refetch,
  } = useColaboradores();

  // Estados de modales para vista docente
  const [isSolicitarModalOpen, setIsSolicitarModalOpen] = useState(false);
  const [colaboradorParaExamenes, setColaboradorParaExamenes] = useState<Colaborador | null>(null);
  const [colaboradorParaBaja, setColaboradorParaBaja] = useState<Colaborador | null>(null);
  const [isBajaProcessing, setIsBajaProcessing] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = ((session?.user as any)?.rol || "").toLowerCase();
  const isDocente = userRole.includes("docente");
  const isAuthorized = isAdmin || isDocente;

  if (status === "loading") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003770]" />
      </div>
    );
  }

  // 403 para usuarios sin rol docente ni admin
  if (status === "authenticated" && !isAuthorized) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">403 · Acceso No Autorizado</h2>
        <p className="text-sm text-gray-500 max-w-md mt-2">
          Solo los docentes y administradores tienen acceso a la gestión de colaboradores de control.
        </p>
      </div>
    );
  }

  const handleSolicitarSubmit = async (input: SolicitudColaboradorInput) => {
    return await solicitar(input);
  };

  const handleConfirmarBaja = async () => {
    if (!colaboradorParaBaja) return;
    try {
      setIsBajaProcessing(true);
      const res = await darDeBaja(colaboradorParaBaja.id);
      if (res.success) {
        setColaboradorParaBaja(null);
      }
    } finally {
      setIsBajaProcessing(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado sin breadcrumbs superior, alineado con el resto del sistema */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#003770]">
            Colaboradores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Revisa y gestiona las solicitudes de vinculación de docentes."
              : "Tu equipo de personal de control"}
          </p>
        </div>

        {/* El botón Solicitar colaborador solo aparece para Docente y usuarios no-admin */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setIsSolicitarModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#003770] hover:bg-[#002a57] text-white font-medium px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Solicitar colaborador</span>
          </button>
        )}
      </div>

      {/* RENDERIZADO CONDICIONAL POR ROL */}
      {isAdmin ? (
        /* VISTA DE ADMINISTRADOR: Pestañas Solicitudes / Todos, tabla y modales de aprobación/rechazo */
        <AdminColaboradoresView
          solicitudesPendientes={solicitudesPendientes}
          todosAdmin={todosAdmin}
          onAprobar={aprobar}
          onRechazar={rechazar}
        />
      ) : (
        /* VISTA DE DOCENTE / OTROS ROLES: Nómina de equipo, tarjetas, gestionar exámenes y dar de baja */
        <div className="space-y-6">
          {/* Buscador y Contador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o código SIS"
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

            {/* Contador oficial de mockups */}
            <div className="text-xs sm:text-sm text-gray-500 font-medium">
              {totales.total} colaboradores · {totales.aprobados} aprobados
            </div>
          </div>

          {/* Grid de tarjetas para el Docente */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="border-t border-gray-100 pt-3" />
                  <div className="h-8 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : colaboradoresFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center mt-4">
              <p className="text-sm font-semibold text-gray-600">
                No se encontraron colaboradores
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm
                  ? "Prueba cambiando el término de búsqueda."
                  : "Aún no tienes colaboradores registrados. Presiona 'Solicitar colaborador' para empezar."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {colaboradoresFiltrados.map((colaborador) => (
                <ColaboradorCard
                  key={colaborador.id}
                  colaborador={colaborador}
                  onGestionarExamenes={(col) => setColaboradorParaExamenes(col)}
                  onDarDeBaja={(col) => setColaboradorParaBaja(col)}
                />
              ))}
            </div>
          )}

          {/* Modales de Docente */}
          <SolicitarColaboradorModal
            isOpen={isSolicitarModalOpen}
            onClose={() => setIsSolicitarModalOpen(false)}
            onSubmit={handleSolicitarSubmit}
            userEmail={userEmail}
          />

          <GestionarExamenesModal
            isOpen={!!colaboradorParaExamenes}
            colaborador={colaboradorParaExamenes}
            onClose={() => setColaboradorParaExamenes(null)}
            onActualizado={refetch}
          />

          <DarDeBajaDialog
            isOpen={!!colaboradorParaBaja}
            colaborador={colaboradorParaBaja}
            onClose={() => setColaboradorParaBaja(null)}
            onConfirm={handleConfirmarBaja}
            isProcessing={isBajaProcessing}
          />
        </div>
      )}
    </div>
  );
}
