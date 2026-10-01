export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_INACTIVE'
  | 'SESSION_CONFLICT'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export interface SessionConflictInfo {
  isOpen: boolean;
  userEmail: string;
  dispositivoPrevio?: string;
  fechaHoraPrevia?: string;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
}

export interface AuditAuthEvent {
  accion: 'LOGIN_EXITOSO' | 'LOGIN_FALLIDO' | 'SESION_CONCURRENTE_REEMPLAZADA' | 'RECUPERACION_PASSWORD_SOLICITADA';
  email: string;
  modulo: string;
  ipOrigen?: string;
  detallesNuevo?: Record<string, unknown>;
}
