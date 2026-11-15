import { apiClient } from '@/shared/lib/api-client';
import { DashboardAsistencia } from '../types/exam.types';

/**
 * Obtiene las métricas de asistencia en tiempo real de un examen específico (HU16).
 * Endpoint: GET /examenes/:id/asistencia
 */
export async function getDashboardAsistencia(examenId: string | number): Promise<DashboardAsistencia> {
  const response = await apiClient.get<DashboardAsistencia>(`/examenes/${examenId}/asistencia`);
  return response.data;
}
