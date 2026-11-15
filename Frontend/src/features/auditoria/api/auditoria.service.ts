import { apiClient } from '@/shared/lib/api-client';

export interface FiltrosAuditoria {
  mes: number;
  anio: number;
  usuarioId?: number;
  accion?: string;
  tabla?: string;
}

export interface EventoAuditoria {
  id: number;
  usuarioId: number | null;
  usuarioNombre: string | null;
  accion: string;
  tablaAfectada: string | null;
  registroId: number | null;
  registroClave: Record<string, unknown> | null;
  detallesAnterior: Record<string, unknown> | null;
  detallesNuevo: Record<string, unknown> | null;
  fechaHora: string;
  registroDescripcion?: string | null;
}

export interface DetalleAuditoria extends EventoAuditoria {
  cambios: { campo: string; anterior: unknown; nuevo: unknown }[];
}

export interface PaginaAuditoria {
  data: EventoAuditoria[];
  total: number;
  pagina: number;
  limite: number;
  mes: number;
  anio: number;
}

export interface OpcionesAuditoria {
  usuarios: { usuarioId: number | null; usuarioNombre: string | null }[];
  acciones: string[];
  tablas: string[];
  primerAnio: number;
}

export const auditoriaApi = {
  async listar(filtros: FiltrosAuditoria, pagina: number, signal?: AbortSignal) {
    return (await apiClient.get<PaginaAuditoria>('/auditoria', { params: { ...filtros, pagina }, signal })).data;
  },
  async opciones(signal?: AbortSignal) {
    return (await apiClient.get<OpcionesAuditoria>('/auditoria/opciones', { signal })).data;
  },
  async detalle(id: number, signal?: AbortSignal) {
    return (await apiClient.get<DetalleAuditoria>(`/auditoria/${id}`, { signal })).data;
  },
  async descargar(filtros: FiltrosAuditoria) {
    const { data } = await apiClient.get<Blob>('/auditoria/reporte', { params: filtros, responseType: 'blob' });
    return data;
  },
};
