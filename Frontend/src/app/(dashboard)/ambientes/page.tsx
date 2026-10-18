"use client";

import { useState } from "react";
import { toast } from 'sonner';
import { mensajeApi } from '@/features/ambientes/lib/integracion';
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { useAmbientes } from "@/features/ambientes/hooks/useAmbientes";
import { useMisReservas } from "@/features/ambientes/hooks/useMisReservas";
import { useHasPermission } from "@/shared/hooks/useHasPermission";
import { AmbientesTabs } from "@/features/ambientes/components/AmbientesTabs";
import { AmbientesBuscador } from "@/features/ambientes/components/AmbientesBuscador";
import { AmbientesGrid } from "@/features/ambientes/components/AmbientesGrid";
import { AmbientesSkeleton } from "@/features/ambientes/components/AmbientesSkeleton";
import { DisponibilidadModal } from "@/features/ambientes/components/DisponibilidadModal";
import { EditarAmbienteModal } from "@/features/ambientes/components/EditarAmbienteModal";
import { MisReservasList } from "@/features/ambientes/components/MisReservasList";
import { ReservaConfirmacionDialog } from "@/features/ambientes/components/ReservaConfirmacionDialog";
import { ReservaCancelarDialog } from "@/features/ambientes/components/ReservaCancelarDialog";
import { Ambiente, PeriodoDisponibilidad, EstadoAmbiente } from "@/features/ambientes/schemas/ambiente.schema";
import { Reserva } from "@/features/ambientes/schemas/reserva.schema";
import { reservasApi } from "@/features/ambientes/api/reservas.api";

export default function AmbientesPage() {
  const [tabActiva, setTabActiva] = useState<"todos" | "mis-reservas">("todos");

  // Permisos: el admin o usuario con 'ambientes.editar' puede editar estado de aula
  const hasEditPermiso = useHasPermission("ambientes.editar");
  const canEditAmbiente = hasEditPermiso;
  const canReservar = useHasPermission('ambientes.registrar_reserva');
  const canCancelar = useHasPermission('ambientes.cancelar_reserva');
  const [disponibilidadVersion, setDisponibilidadVersion] = useState(0);

  // Estado para modal de disponibilidad (HU10)
  const [ambienteSeleccionado, setAmbienteSeleccionado] = useState<Ambiente | null>(null);
  const [isDisponibilidadOpen, setIsDisponibilidadOpen] = useState<boolean>(false);

  // Estado para modal de editar ambiente (Edición de estado de aula)
  const [ambienteParaEditar, setAmbienteParaEditar] = useState<Ambiente | null>(null);
  const [isEditarOpen, setIsEditarOpen] = useState<boolean>(false);
  const [isGuardandoEstado, setIsGuardandoEstado] = useState<boolean>(false);

  // Estado para confirmación de reserva (HU15)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoDisponibilidad | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>("");
  const [isConfirmarReservaOpen, setIsConfirmarReservaOpen] = useState<boolean>(false);
  const [isConfirmandoReserva, setIsConfirmandoReserva] = useState<boolean>(false);

  // Estado para cancelación de reserva (HU15)
  const [reservaParaCancelar, setReservaParaCancelar] = useState<Reserva | null>(null);
  const [isCancelarOpen, setIsCancelarOpen] = useState<boolean>(false);
  const [isCancelandoReserva, setIsCancelandoReserva] = useState<boolean>(false);

  // Hooks de datos
  const {
    ambientes,
    searchTerm,
    setSearchTerm,
    isLoading: isLoadingAmbientes,
    error: errorAmbientes,
    refetch: refetchAmbientes,
    actualizarEstadoAmbiente,
  } = useAmbientes();

  const {
    reservas,
    isLoading: isLoadingReservas,
    error: errorReservas,
    refetch: refetchReservas,
    cancelarReserva,
  } = useMisReservas();

  // Handlers HU10 - Disponibilidad
  const handleVerDisponibilidad = (ambiente: Ambiente) => {
    setAmbienteSeleccionado(ambiente);
    setDisponibilidadVersion(n => n + 1);
    setIsDisponibilidadOpen(true);
  };

  const handleCloseDisponibilidad = () => {
    setIsDisponibilidadOpen(false);
    setAmbienteSeleccionado(null);
  };

  // Handlers Editar Ambiente
  const handleAbrirEditar = (ambiente: Ambiente) => {
    setAmbienteParaEditar(ambiente);
    setIsEditarOpen(true);
  };

  const handleGuardarEstado = async (ambienteId: string | number, nuevoEstado: EstadoAmbiente) => {
    try {
      setIsGuardandoEstado(true);
      await actualizarEstadoAmbiente(ambienteId, nuevoEstado);
      setIsEditarOpen(false);
      setAmbienteParaEditar(null);
    } catch (err) {
      toast.error(mensajeApi(err, 'No se pudo actualizar el estado del ambiente.'));
    } finally {
      setIsGuardandoEstado(false);
    }
  };

  // Handlers HU15 - Confirmar Reserva
  const handleSelectPeriodo = (
    ambiente: Ambiente,
    fecha: string,
    periodo: PeriodoDisponibilidad
  ) => {
    if (!canReservar) return;
    setAmbienteSeleccionado(ambiente);
    setFechaSeleccionada(fecha);
    setPeriodoSeleccionado(periodo);
    setIsConfirmarReservaOpen(true);
  };

  const handleConfirmarReserva = async () => {
    if (!ambienteSeleccionado || !periodoSeleccionado) return;

    try {
      setIsConfirmandoReserva(true);
      await reservasApi.crearReserva({
        ambienteId: ambienteSeleccionado.id,
        ambienteNombre: ambienteSeleccionado.nombre,
        fecha: fechaSeleccionada,
        horarioFijoId: periodoSeleccionado.id,
        periodoNombre: periodoSeleccionado.periodoNombre,
      });

      // Cerrar modales y llevar a la pestaña "Mis reservas"
      setIsConfirmarReservaOpen(false);
      setIsDisponibilidadOpen(false);
      setTabActiva("mis-reservas");
      await refetchReservas();
      setDisponibilidadVersion(n => n + 1);
    } catch (err) {
      toast.error(mensajeApi(err, 'No se pudo crear la reserva.'));
      setDisponibilidadVersion(n => n + 1);
    } finally {
      setIsConfirmandoReserva(false);
    }
  };

  // Handlers HU15 - Cancelar Reserva
  const handleAbrirCancelar = (reserva: Reserva) => {
    if (!canCancelar) return;
    setReservaParaCancelar(reserva);
    setIsCancelarOpen(true);
  };

  const handleConfirmarCancelar = async (reserva: Reserva) => {
    try {
      setIsCancelandoReserva(true);
      await cancelarReserva(reserva.id);
      setDisponibilidadVersion(n => n + 1);
      setIsCancelarOpen(false);
      setReservaParaCancelar(null);
    } catch (err) {
      toast.error(mensajeApi(err, 'No se pudo cancelar la reserva.'));
    } finally {
      setIsCancelandoReserva(false);
    }
  };

  return (
    <PageContainer
      title="Ambientes"
      subtitle="Consulta disponibilidad y gestiona tus reservas"
    >
      <div className="space-y-6">
        {/* Pestañas: Todos / Mis reservas */}
        <AmbientesTabs
          tabActiva={tabActiva}
          onTabChange={setTabActiva}
        />

        {/* Pestaña: Todos (HU10) */}
        {tabActiva === "todos" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="max-w-md">
              <AmbientesBuscador
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>

            {!isLoadingAmbientes && !errorAmbientes && (
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <span>{ambientes.length} {ambientes.length === 1 ? "ambiente" : "ambientes"}</span>
              </div>
            )}

            {isLoadingAmbientes ? (
              <AmbientesSkeleton />
            ) : (
              <AmbientesGrid
                ambientes={ambientes}
                onVerDisponibilidad={handleVerDisponibilidad}
                onEditarAmbiente={handleAbrirEditar}
                canEdit={canEditAmbiente}
                onLimpiarBusqueda={() => setSearchTerm("")}
                error={errorAmbientes}
                onReintentar={refetchAmbientes}
              />
            )}
          </div>
        )}

        {/* Pestaña: Mis reservas (HU15) */}
        {tabActiva === "mis-reservas" && (
          <div className="animate-in fade-in duration-200">
            <MisReservasList
              reservas={reservas}
              isLoading={isLoadingReservas}
              error={errorReservas}
              onReintentar={refetchReservas}
              onExplorarAmbientes={() => setTabActiva("todos")}
              onCancelarReserva={handleAbrirCancelar}
              canCancelar={canCancelar}
            />
          </div>
        )}

        {/* Modal de disponibilidad (HU10) */}
        <DisponibilidadModal
          isOpen={isDisponibilidadOpen}
          ambiente={ambienteSeleccionado}
          onClose={handleCloseDisponibilidad}
          onSelectPeriodo={handleSelectPeriodo}
          canReservar={canReservar}
          version={disponibilidadVersion}
        />

        {/* Modal para editar estado del ambiente (Ícono lápiz) */}
        <EditarAmbienteModal
          isOpen={isEditarOpen}
          ambiente={ambienteParaEditar}
          onClose={() => setIsEditarOpen(false)}
          onGuardar={handleGuardarEstado}
          isProcessing={isGuardandoEstado}
        />

        {/* Diálogo de confirmación de reserva (HU15) */}
        <ReservaConfirmacionDialog
          isOpen={isConfirmarReservaOpen}
          ambiente={ambienteSeleccionado}
          fecha={fechaSeleccionada}
          periodo={periodoSeleccionado}
          onClose={() => setIsConfirmarReservaOpen(false)}
          onConfirm={handleConfirmarReserva}
          isProcessing={isConfirmandoReserva}
        />

        {/* Diálogo de cancelación de reserva (HU15) */}
        <ReservaCancelarDialog
          isOpen={isCancelarOpen}
          reserva={reservaParaCancelar}
          onClose={() => setIsCancelarOpen(false)}
          onConfirm={handleConfirmarCancelar}
          isProcessing={isCancelandoReserva}
        />
      </div>
    </PageContainer>
  );
}
