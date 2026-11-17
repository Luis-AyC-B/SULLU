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

export interface EjecucionRespaldo {
  fechaHora: string;
  archivo: string;
  estado: 'EXITOSO' | 'FALLIDO';
  tamanoBytes: string | null;
  restauradoEnPrueba: boolean;
  restauracion: {
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'FALLIDA';
    baseRestaurada: string | null;
    error: string | null;
  } | null;
}

export interface ProgramacionRespaldos {
  proximoAutomatico: string | null;
  horaServidor: string;
  activo: boolean;
  ejecucion: 'AUTOMATICA' | 'MANUAL' | null;
  manualPendiente: boolean;
  resultadoManual: 'EXITOSO' | 'FALLIDO' | null;
}

export const auditoriaApi = {
  async listar(filtros: FiltrosAuditoria, pagina: number, signal?: AbortSignal) {
    return (await apiClient.get<PaginaAuditoria>('/auditoria', { params: { ...filtros, pagina }, signal })).data;
  },
  async opciones(signal?: AbortSignal) {
    return (await apiClient.get<OpcionesAuditoria>('/auditoria/opciones', { signal })).data;
  },
  async respaldos(signal?: AbortSignal) {
    return (await apiClient.get<EjecucionRespaldo[]>('/auditoria/respaldos', { signal })).data;
  },
  async programacionRespaldos(signal?: AbortSignal) {
    return (await apiClient.get<ProgramacionRespaldos>('/auditoria/respaldos/programacion', { signal })).data;
  },
  async solicitarRespaldo() {
    return (await apiClient.post<{ aceptada: boolean }>('/auditoria/respaldos/solicitudes')).data;
  },
  async restaurarRespaldo(respaldo: Pick<EjecucionRespaldo, 'fechaHora' | 'archivo'>) {
    await apiClient.post('/auditoria/respaldos/restauraciones', respaldo);
  },
  async detalle(id: number, signal?: AbortSignal) {
    return (await apiClient.get<DetalleAuditoria>(`/auditoria/${id}`, { signal })).data;
  },
  async descargar(filtros: FiltrosAuditoria) {
    const { data } = await apiClient.get<Blob>('/auditoria/reporte', { params: filtros, responseType: 'blob' });
    return data;
  },
};
