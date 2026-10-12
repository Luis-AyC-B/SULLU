import { apiClient } from '@/shared/lib/api-client';
import { Ambiente, PeriodoDisponibilidad, EstadoAmbiente } from '../schemas/ambiente.schema';
export interface GetAmbientesParams { facultadId?: string | number; tipoAulaId?: string | number; estado?: string; search?: string }
export const ambientesApi = {
  async getAmbientes(params?: GetAmbientesParams): Promise<Ambiente[]> {
    const { data } = await apiClient.get<Ambiente[]>('/ambientes');
    // El backend siempre aplica el alcance. Los filtros opcionales solo lo restringen.
    return data.filter(a => (!params?.facultadId || String(a.facultadId) === String(params.facultadId)) && (!params?.tipoAulaId || String(a.tipoAulaId) === String(params.tipoAulaId)) && (!params?.estado || a.estado === params.estado) && (!params?.search || a.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(params.search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())));
  },
  async updateEstadoAmbiente(id: string | number, estado: EstadoAmbiente): Promise<Ambiente> {
    return (await apiClient.patch<Ambiente>(`/ambientes/${id}/estado`, { estado })).data;
  },
  async getDisponibilidad(id: string | number, fecha: string, signal?: AbortSignal): Promise<PeriodoDisponibilidad[]> {
    return (await apiClient.get<PeriodoDisponibilidad[]>(`/ambientes/${id}/disponibilidad`, { params: { fecha }, signal })).data;
  },
};
