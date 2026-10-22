import { isAxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import {
  CODIGOS_ERROR_QR_EXAMEN,
  EXAM_QR_ENDPOINTS,
  ExamQrError,
  type CodigoErrorQrExamen,
  type RespuestaExamenes,
  type RespuestaGenerarQrExamen,
} from '../types/qr-examen';
import { adaptarRespuestaExamenes } from '../lib/adaptador-examenes';

export interface IExamQrService {
  getExamenes(): Promise<RespuestaExamenes>;
  generarQrExamen(examenId: number | string, selfie?: Blob | File): Promise<RespuestaGenerarQrExamen>;
}

export class RealExamQrService implements IExamQrService {
  async getExamenes(): Promise<RespuestaExamenes> {
    try {
      const { data } = await apiClient.get(EXAM_QR_ENDPOINTS.LISTAR_EXAMENES);
      return adaptarRespuestaExamenes(data);
    } catch (error: unknown) {
      if (error instanceof ExamQrError) throw error;
      if (isAxiosError(error)) {
        const codigo = (error.response?.data?.codigo as CodigoErrorQrExamen) || CODIGOS_ERROR_QR_EXAMEN.ERROR_RED;
        const mensaje = error.response?.data?.mensaje as string | undefined;
        throw new ExamQrError({
          codigo,
          mensaje,
          status: error.response?.status,
        });
      }
      throw new ExamQrError({ codigo: CODIGOS_ERROR_QR_EXAMEN.ERROR_RED });
    }
  }

  async generarQrExamen(
    examenId: number | string,
    selfie?: Blob | File,
  ): Promise<RespuestaGenerarQrExamen> {
    try {
      const formData = new FormData();
      if (selfie) {
        const fileToAppend = selfie instanceof File ? selfie : new File([selfie], 'selfie.jpg', { type: 'image/jpeg' });
        formData.append('selfie', fileToAppend);
      }

      const { data } = await apiClient.post<RespuestaGenerarQrExamen>(
        EXAM_QR_ENDPOINTS.GENERAR_QR_EXAMEN(examenId),
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      return data;
    } catch (error: unknown) {
      if (error instanceof ExamQrError) throw error;
      if (isAxiosError(error)) {
        const responseData = error.response?.data as {
          codigo?: CodigoErrorQrExamen;
          mensaje?: string;
          intentosRestantes?: number;
        } | undefined;

        const codigo = responseData?.codigo || CODIGOS_ERROR_QR_EXAMEN.ERROR_RED;
        const mensaje = responseData?.mensaje;
        const intentosRestantes = responseData?.intentosRestantes;

        throw new ExamQrError({
          codigo,
          mensaje,
          intentosRestantes,
          status: error.response?.status,
        });
      }
      throw new ExamQrError({ codigo: CODIGOS_ERROR_QR_EXAMEN.ERROR_RED });
    }
  }
}

/**
 * Retorna el servicio correspondiente según el entorno.
 * Si NEXT_PUBLIC_USE_MOCKS es 'true' y no estamos en producción, importa dinámicamente MockExamQrService.
 */
export async function getExamQrService(): Promise<IExamQrService> {
  const isMockEnabled =
    process.env.NEXT_PUBLIC_USE_MOCKS === 'true' &&
    process.env.NODE_ENV !== 'production';

  if (isMockEnabled) {
    const { MockExamQrService } = await import('./mock-exam-qr.service');
    return new MockExamQrService();
  }

  return new RealExamQrService();
}
