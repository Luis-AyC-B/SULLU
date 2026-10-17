import { apiClient } from '@/shared/lib/api-client';
import { Reserva, CrearReservaInput } from '../schemas/reserva.schema';
export const reservasApi = {
  async getMisReservas(): Promise<Reserva[]> { return (await apiClient.get<Reserva[]>('/reservas/mis-reservas')).data; },
  async crearReserva(input: CrearReservaInput): Promise<Reserva> {
    return (await apiClient.post<Reserva>('/reservas', { ambienteId: input.ambienteId, horarioFijoId: input.horarioFijoId, fecha: input.fecha })).data;
  },
  async cancelarReserva(id: string | number): Promise<void> { await apiClient.patch(`/reservas/${id}/cancelar`); },
};
