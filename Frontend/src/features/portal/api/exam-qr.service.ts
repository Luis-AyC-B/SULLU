import axios, { isAxiosError } from 'axios';
import { apiClient } from '@/shared/lib/api-client';
import {
  CODIGOS_ERROR_QR_EXAMEN,
  EXAM_QR_ENDPOINTS,
  ExamQrError,
  type CodigoErrorQrExamen,
  type RespuestaExamenes,
  type RespuestaGenerarQrExamen,
  type ResultadoValidacionQr,
} from '../types/qr-examen';
import { adaptarRespuestaExamenes } from '../lib/adaptador-examenes';

export interface IExamQrService {
  getExamenes(): Promise<RespuestaExamenes>;
  generarQrExamen(examenId: number | string, selfie?: Blob | File): Promise<RespuestaGenerarQrExamen>;
  validarTokenQr(token: string): Promise<ResultadoValidacionQr>;
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
        const codigo = (error.response?.data?.codigo as CodigoErrorQrExamen) || CODIGOS_ERROR_QR_EXAMEN.ERROR_RED;
        const mensaje = error.response?.data?.mensaje as string | undefined;
        const intentosRestantes = error.response?.data?.intentosRestantes as number | undefined;
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

  async validarTokenQr(token: string): Promise<ResultadoValidacionQr> {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3001';

    try {
      const res = await axios.get(`${backendUrl}${EXAM_QR_ENDPOINTS.VALIDAR_QR_PUBLICO}`, {
        params: { token },
        headers: { 'Cache-Control': 'no-store' },
      });

      const data = res.data;
      if (data.estado === 'VALIDO') {
        const primerExamen = Array.isArray(data.examenes) && data.examenes.length > 0 ? data.examenes[0] : undefined;
        return {
          esValido: true,
          estudiante: {
            nombre: data.nombre || 'Estudiante',
            sis: data.sis || '—',
            carrera: data.carrera,
            fotoUrl: data.fotoUrl,
          },
          examen: primerExamen,
          examenes: data.examenes,
        };
      }

      if (data.estado === 'EXPIRADO') {
        return {
          esValido: false,
          motivoRechazo: 'VENCIDO',
          mensaje: data.mensaje || 'Este código venció',
        };
      }

      if (data.estado === 'REVOCADO') {
        return {
          esValido: false,
          motivoRechazo: 'REVOCADO',
          mensaje: data.mensaje || 'Este código fue revocado',
        };
      }

      return {
        esValido: false,
        motivoRechazo: 'INVALIDO',
        mensaje: data.mensaje || 'Código no válido',
      };
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data) {
        const estado = err.response.data.estado;
        if (estado === 'EXPIRADO') {
          return { esValido: false, motivoRechazo: 'VENCIDO', mensaje: err.response.data.mensaje };
        }
        if (estado === 'REVOCADO') {
          return { esValido: false, motivoRechazo: 'REVOCADO', mensaje: err.response.data.mensaje };
        }
        if (estado === 'INVALIDO') {
          return { esValido: false, motivoRechazo: 'INVALIDO', mensaje: err.response.data.mensaje };
        }
      }
      throw err;
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

