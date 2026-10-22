/**
 * Contrato de API y tipos para el QR por examen (HU6).
 * Este archivo centraliza constantes de endpoints, códigos de error estables
 * y tipados TypeScript.
 */

export const EXAM_QR_ENDPOINTS = {
  LISTAR_EXAMENES: '/estudiantes/me/examenes',
  GENERAR_QR_EXAMEN: (examenId: number | string) => `/estudiantes/me/examenes/${examenId}/qr`,
  VALIDAR_QR_PUBLICO: '/qr/validar',
} as const;

export type EstadoQr =
  | 'NO_DISPONIBLE_AUN'
  | 'DISPONIBLE'
  | 'GENERADO'
  | 'FINALIZADO'
  | 'INHABILITADO';

export interface Examen {
  id: number;
  carrera: string;
  nombre: string;
  ambiente: string;
  fechaInicio: string; // ISO 8601 con zona horaria
  fechaFin: string; // ISO 8601 con zona horaria
  habilitado: boolean;
  estadoQr: EstadoQr;
  qrDisponibleDesde: string; // ISO 8601 con zona horaria
  qrVigenteHasta: string; // ISO 8601 con zona horaria (coincide con fin de examen)
  qrGenerado: boolean;
  qrUrl?: string | null;
  token?: string | null;
  facultad?: string;
  esLegado?: boolean; // Marca si provino del formato antiguo del backend
}

export interface RespuestaExamenes {
  verificacionFotoActiva: boolean;
  examenes: Examen[];
}

export interface RespuestaGenerarQrExamen {
  qrUrl: string;
  vigenteHasta: string;
  token?: string;
}

export const CODIGOS_ERROR_QR_EXAMEN = {
  QR_AUN_NO_DISPONIBLE: 'QR_AUN_NO_DISPONIBLE',
  QR_EXAMEN_FINALIZADO: 'QR_EXAMEN_FINALIZADO',
  EXAMEN_NO_HABILITADO: 'EXAMEN_NO_HABILITADO',
  FOTO_INVALIDA: 'FOTO_INVALIDA',
  FOTO_REFERENCIA_FALTANTE: 'FOTO_REFERENCIA_FALTANTE',
  VERIFICACION_FALLIDA: 'VERIFICACION_FALLIDA',
  SIN_ROSTRO: 'SIN_ROSTRO',
  VERIFICACION_INTENTOS_AGOTADOS: 'VERIFICACION_INTENTOS_AGOTADOS',
  ERROR_RED: 'ERROR_RED',
} as const;

export type CodigoErrorQrExamen =
  (typeof CODIGOS_ERROR_QR_EXAMEN)[keyof typeof CODIGOS_ERROR_QR_EXAMEN];

export const MENSAJES_ERROR_QR_EXAMEN: Record<CodigoErrorQrExamen, string> = {
  QR_AUN_NO_DISPONIBLE: 'El código QR aún no está disponible para este examen. Se habilitará 24 horas antes del inicio.',
  QR_EXAMEN_FINALIZADO: 'Este examen ya ha finalizado. El código QR no puede ser generado ni utilizado.',
  EXAMEN_NO_HABILITADO: 'No estás habilitado para rendir este examen. Consulta con tu docente o dirección de carrera.',
  FOTO_INVALIDA: 'La fotografía enviada no es válida. Asegúrate de enviar una imagen JPG o PNG de hasta 2 MB.',
  FOTO_REFERENCIA_FALTANTE: 'No tienes una foto de perfil registrada como referencia. Completa tu perfil antes de continuar.',
  VERIFICACION_FALLIDA: 'No pudimos verificar tu identidad con la fotografía tomada.',
  SIN_ROSTRO: 'No se detectó un rostro claro en la fotografía. Ubícate de frente a la cámara con buena iluminación.',
  VERIFICACION_INTENTOS_AGOTADOS: 'Has agotado los 3 intentos de verificación de identidad.',
  ERROR_RED: 'No pudimos conectarnos con el servidor. Revisa tu conexión e intenta de nuevo.',
};

export class ExamQrError extends Error {
  readonly codigo: CodigoErrorQrExamen;
  readonly intentosRestantes?: number;
  readonly status?: number;

  constructor(params: {
    codigo: CodigoErrorQrExamen;
    mensaje?: string;
    intentosRestantes?: number;
    status?: number;
  }) {
    super(params.mensaje || MENSAJES_ERROR_QR_EXAMEN[params.codigo] || 'Error en la operación del QR');
    this.name = 'ExamQrError';
    this.codigo = params.codigo;
    this.intentosRestantes = params.intentosRestantes;
    this.status = params.status;
  }
}
